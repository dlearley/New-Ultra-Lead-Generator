import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <h1>Map Alerts & Onboarding</h1>
      <p>Welcome to the territory management system</p>

      <nav>
        <ul>
          <li>
            <Link href="/map">
              <a>Map - Territory Management</a>
            </Link>
          </li>
          <li>
            <Link href="/alerts">
              <a>Alerts - Alert Manager</a>
            </Link>
          </li>
          <li>
            <Link href="/onboarding">
              <a>Onboarding - Setup Wizard</a>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
