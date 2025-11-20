import { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

const HomePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Multi-Service Web App</title>
        <meta name="description" content="Multi-service application web frontend" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to Multi-Service Web App
        </h1>

        <p className={styles.description}>
          Web frontend for the multi-service application
        </p>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>Documentation &rarr;</h2>
            <p>Find in-depth information about features and API.</p>
          </div>

          <div className={styles.card}>
            <h2>Status &rarr;</h2>
            <p>Check system status and health information.</p>
          </div>
        </div>
      </main>
    </>
  );
};

export default HomePage;