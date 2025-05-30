import React, { useEffect, useState } from 'react';
import axios from 'axios';

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
      <h1>Available Tests</h1>
      <ul>
        {tests.map(test => (
          <li key={test.id} style={{ marginBottom: '1rem' }}>
            <h3>{test.title}</h3>
            <p>{test.description}</p>
            <button onClick={() => alert(`Start test ${test.id}`)}>
              Take Test
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TestList;
