import React, { useState, useEffect } from "react";
import api from "../../services/api"; 

const TestsPage = () => {
  const [tests, setTests] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    // Load tests and clients from backend
    async function loadData() {
      const testsData = await api.getTests(); // define in your api
      const clientsData = await api.getClients(); // define in your api
      setTests(testsData);
      setClients(clientsData);
    }
    loadData();
  }, []);

  const assignTest = async () => {
    if (!selectedTest || !selectedClient) return;

    try {
      await api.assignTestToClient(selectedTest, selectedClient);
      alert("Test assigned!");
    } catch (err) {
      alert("Error assigning test");
    }
  };

  return (
    <div>
      <h2>Assign Tests to Clients</h2>
      <div>
        <label>Choose Test:</label>
        <select onChange={(e) => setSelectedTest(e.target.value)}>
          <option value="">Select a test</option>
          {tests.map((test) => (
            <option key={test.id} value={test.id}>
              {test.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Choose Client:</label>
        <select onChange={(e) => setSelectedClient(e.target.value)}>
          <option value="">Select a client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.email}
            </option>
          ))}
        </select>
      </div>

      <button onClick={assignTest}>Assign Test</button>
    </div>
  );
};

export default TestsPage;
