import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const keyLength = 32;

export class EncryptionService {
  private static getKey(): Buffer {
    return Buffer.from(secretKey, 'hex');
  }

  static encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const key = this.getKey();
    const cipher = crypto.createCipher('aes-256-gcm', key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  static decrypt(encryptedData: { encrypted: string; iv: string; tag: string }): string {
    const key = this.getKey();
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static encryptCredentials(credentials: Record<string, any>): Record<string, any> {
    const encrypted: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'string' && this.isSensitiveField(key)) {
        const encryptedValue = this.encrypt(value);
        encrypted[key] = {
          encrypted: encryptedValue.encrypted,
          iv: encryptedValue.iv,
          tag: encryptedValue.tag,
          __encrypted: true
        };
      } else {
        encrypted[key] = value;
      }
    }
    
    return encrypted;
  }

  static decryptCredentials(encryptedCredentials: Record<string, any>): Record<string, any> {
    const decrypted: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(encryptedCredentials)) {
      if (typeof value === 'object' && value !== null && value.__encrypted) {
        const decryptedValue = this.decrypt({
          encrypted: value.encrypted,
          iv: value.iv,
          tag: value.tag
        });
        decrypted[key] = decryptedValue;
      } else {
        decrypted[key] = value;
      }
    }
    
    return decrypted;
  }

  private static isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'secret',
      'token',
      'key',
      'apikey',
      'api_key',
      'private_key',
      'auth'
    ];
    
    return sensitiveFields.some(sensitive => 
      fieldName.toLowerCase().includes(sensitive)
    );
  }
}