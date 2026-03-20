import React, { useEffect, useState } from 'react';
import client from '../api/client';
import Loader from '../components/common/Loader';
import { getErrorMessage } from '../utils/http';

const WalletPage = () => {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [loyalty, setLoyalty] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: walletData }, { data: dashboardData }] = await Promise.all([
          client.get('/users/wallet?limit=50'),
          client.get('/users/dashboard')
        ]);

        setTransactions(walletData.data.items);
        setBalance(dashboardData.data.walletBalance);
        setLoyalty(dashboardData.data.loyaltyPoints);
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load wallet'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <section className="page"><Loader text="Loading wallet" /></section>;
  }

  if (error) {
    return <section className="page"><p className="error-text">{error}</p></section>;
  }

  return (
    <section className="grid" style={{ gap: 16 }}>
      <article className="page">
        <h2>Wallet</h2>
        <div className="grid cols-2">
          <article className="stat-tile">
            <p>Current balance</p>
            <h3>INR {balance.toFixed(2)}</h3>
          </article>
          <article className="stat-tile">
            <p>Loyalty points</p>
            <h3>{loyalty} pts</h3>
            <small>100 points = INR 50 discount</small>
          </article>
        </div>
      </article>

      <article className="page">
        <h3>Wallet transaction history</h3>
        {transactions.length === 0 ? (
          <p>No wallet transactions yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td>{tx.type}</td>
                    <td>{tx.reason}</td>
                    <td>{tx.type === 'credit' ? '+' : '-'} INR {tx.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
};

export default WalletPage;
