import React, {useEffect, useState} from 'react'
import { Clifton_Test, Test_Cards } from '../../services/dummyData';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {Disc_Test, Haland_Test, Gardner_Test} from '../../services/dummyData';
import "../../styles/starterTestPage.css";
import DiscTest from '../../components/Tests/DISCTest';
import HollandTest from '../../components/Tests/HalandTest';
import GardnerTest from '../../components/Tests/GardnerTest';
import MBTITest from '../../components/Tests/MBTITest';
import CliftonTest from '../../components/Tests/CliftonTest';

const StarterTestPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { testId } = useParams();

    const [currentTest, setCurrentTest] = useState(null);
    const [allTests, setAllTests] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [completedTests, setCompletedTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [started, setStarted] = useState(false);

    const handleStart = () => {
      // fetch_Questions(testId);  
      setStarted(true);
    };

    // const fetch_Questions = (id) => {
    //   // Fill Questions Data 
    //   const testMap = {
    //     mbti: Haland_Test,
    //     holland: Haland_Test,
    //     gardner: Gardner_Test,
    //     disc: Disc_Test,
    //     clifton: Clifton_Test,
    //   };
    //   const Q = testMap[id] || Haland_Test;
      
    //   // console.log(Q);
    //   setQuestions(Q);
    // }
  

    // const finishTest = () => {
    //   navigate('/users/dashboard');
    // }


    useEffect(() => {
      const fetchTests = async () => {
        try {
          // Fill existing Test information
          const dummydata = Test_Cards;
          setAllTests(dummydata);
        
          const foundTest = Test_Cards.find(t => t.id === testId);
          setCurrentTest(foundTest);
          console.log(currentTest.duration);

          // Fill user Tests Data
          const completed  = user?.testsAssigned.private || [];
          setCompletedTests(completed );
          console.log(testId);

        
        
        } catch (err) {
          setError('خطا در بارگذاری تست‌ها.');
        } finally {
          setLoading(false);
        }
      };
    
      if (user?.id) fetchTests();

    }, [user?.id, testId]);

    if (!currentTest) {
      return <div className="start-test-container">Loading test data...</div>;
    }

  return (
    <div className="start-test-container">
      {!started ? (
        <>
          <h1>{currentTest.name}</h1>
          <p>{currentTest.description}</p>
          <p>
            <strong>Duration:</strong>{" "}
            {currentTest.duration?.from && currentTest.duration?.to
              ? `${currentTest.duration.from} to ${currentTest.duration.to} minutes`
              : "Not specified"}
          </p>
          <button className="start-button" onClick={handleStart}>
            Start Test
          </button>
        </>
      ) : (
          <div className="test-interface">
                  <h2>{currentTest.name}</h2>
                  {/* <p>{JSON.stringify(questions)}</p> */}

                  {testId === 'MBTI' && <MBTITest  />}
                  {testId === 'DISC' && <DiscTest  />}
                  {testId === 'holland' && <HollandTest  />}
                  {testId === 'gardner' && <GardnerTest  />}
                  {testId === 'clifton' && <CliftonTest  />}

                  {/* <button className="submit-button" onClick={finishTest}>Submit Test</button> */}
                </div>
      )}
    </div>
  )
}

export default StarterTestPage
