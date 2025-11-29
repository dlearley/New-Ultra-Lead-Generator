import { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Admin.module.css';

const AdminHomePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Admin Panel - Multi-Service App</title>
        <meta name="description" content="Admin panel for multi-service application" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Admin Panel
        </h1>

        <p className={styles.description}>
          Administrative interface for system management
        </p>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>User Management &rarr;</h2>
            <p>Manage users, roles, and permissions.</p>
          </div>

          <div className={styles.card}>
            <h2>System Monitoring &rarr;</h2>
            <p>Monitor system health and performance metrics.</p>
          </div>

          <div className={styles.card}>
            <h2>Configuration &rarr;</h2>
            <p>Configure system settings and parameters.</p>
          </div>
        </div>
      </main>
    </>
  );
};

export default AdminHomePage;