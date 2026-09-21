import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const TestList = () => {
  const [tests, setTests] = useState([]);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await axios.get('/api/tests');
        setTests(res.data.tests);
      } catch (err) {
        console.error('Failed to load tests', err);
      }
    };

    fetchTests();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>آزمون‌های موجود</h1>
      <ul>
        {tests.map(test => (
          <li key={test.id} style={{ marginBottom: '1rem' }}>
            <h3>{test.title}</h3>
            <p>{test.description}</p>
            <Link className="button-primary" to="/login">ورود به سامانه</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TestList;
