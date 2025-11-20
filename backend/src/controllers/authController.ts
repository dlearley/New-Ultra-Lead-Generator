import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { AdminUser, ApiResponse } from '../types';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      const result = await pool.query(
        'SELECT * FROM admin_users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const user = result.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      await pool.query(
        'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      const { password_hash, ...userWithoutPassword } = user;

      const response: ApiResponse<{ user: AdminUser; token: string }> = {
        success: true,
        data: {
          user: userWithoutPassword,
          token
        },
        message: 'Login successful'
      };

      res.json(response);
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { email, password, role = 'admin', permissions = [] } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      const existingUser = await pool.query(
        'SELECT id FROM admin_users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const defaultPermissions = permissions.length > 0 ? permissions : [
        { resource: 'data_sources', actions: ['read', 'write', 'delete'] },
        { resource: 'feature_flags', actions: ['read', 'write', 'delete'] },
        { resource: 'plans', actions: ['read', 'write', 'delete'] },
        { resource: 'data_quality', actions: ['read', 'write'] },
        { resource: 'health_logs', actions: ['read', 'write'] }
      ];

      const result = await pool.query(
        `INSERT INTO admin_users 
         (email, password_hash, role, permissions)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role, permissions, created_at`,
        [email, passwordHash, role, defaultPermissions]
      );

      const user = result.rows[0];

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      const response: ApiResponse<{ user: AdminUser; token: string }> = {
        success: true,
        data: {
          user,
          token
        },
        message: 'User registered successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getCurrentUser(req: any, res: Response) {
    try {
      const result = await pool.query(
        'SELECT id, email, role, permissions, last_login, created_at FROM admin_users WHERE id = $1',
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const response: ApiResponse<AdminUser> = {
        success: true,
        data: result.rows[0]
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching current user:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async updateProfile(req: any, res: Response) {
    try {
      const { email } = req.body;
      const userId = req.user.id;

      let updateFields = [];
      let updateValues = [];
      let paramIndex = 1;

      if (email && email !== req.user.email) {
        const existingUser = await pool.query(
          'SELECT id FROM admin_users WHERE email = $1 AND id != $2',
          [email, userId]
        );

        if (existingUser.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'User with this email already exists'
          });
        }

        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(email);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(userId);

      const result = await pool.query(
        `UPDATE admin_users 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, email, role, permissions, last_login, created_at`,
        updateValues
      );

      const response: ApiResponse<AdminUser> = {
        success: true,
        data: result.rows[0],
        message: 'Profile updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async changePassword(req: any, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
      }

      const userResult = await pool.query(
        'SELECT password_hash FROM admin_users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        userResult.rows[0].password_hash
      );

      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      await pool.query(
        'UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getUsers(req: any, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const countResult = await pool.query('SELECT COUNT(*) FROM admin_users');
      const total = parseInt(countResult.rows[0].count);

      const result = await pool.query(
        `SELECT id, email, role, permissions, last_login, created_at 
         FROM admin_users 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const response: ApiResponse<AdminUser[]> = {
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async updateUserRole(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { role, permissions } = req.body;

      if (req.user.role !== 'super_admin' && req.user.id !== id) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update user role'
        });
      }

      let updateFields = [];
      let updateValues = [];
      let paramIndex = 1;

      if (role !== undefined) {
        updateFields.push(`role = $${paramIndex++}`);
        updateValues.push(role);
      }

      if (permissions !== undefined) {
        updateFields.push(`permissions = $${paramIndex++}`);
        updateValues.push(permissions);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const result = await pool.query(
        `UPDATE admin_users 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, email, role, permissions, last_login, created_at`,
        updateValues
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'User role updated successfully'
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}