import React, {useEffect, useState} from 'react'
import {  Ghq_Test, PersonalFavorites_Test, Test_Cards } from '../../services/dummyData';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {Disc_Test, Clifton_Test, Mbti_Test, Holland_Test, Gardner_Test} from '../../services/dummyData';
import "../../styles/starterTestPage.css";
import DiscTest from '../../components/Tests/DISCTest';
import HollandTest from '../../components/Tests/HollandTest';
import GardnerTest from '../../components/Tests/GardnerTest';
import MBTITest from '../../components/Tests/MBTITest';
import CliftonTest from '../../components/Tests/CliftonTest';
import GHQTest from '../../components/Tests/GHQTest';
import PersonalFavoritesTest from '../../components/Tests/PersonalFavoritesTest';

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
          // console.log(currentTest.duration);

          switch (foundTest.id) {
            case "MBTI":
              setQuestions(Mbti_Test);
              break;
            case "DISC":
              setQuestions(Disc_Test);
              break;
            case "HOLLAND":
              setQuestions(Holland_Test);
              break;
            case "CLIFTON":
              setQuestions(Clifton_Test);
              break;
            case "GARDNER":
              setQuestions(Gardner_Test);
              break;
            case "GHQ":
              setQuestions(Ghq_Test);
              break;
            case "PERSONAL_FAVORITES":
              setQuestions(PersonalFavorites_Test);
              break;
            default:
              setQuestions([]);
              break;
          }

          // Fill user Tests Data
          const completed  = user?.testsAssigned.private || [];
          setCompletedTests(completed );
          // console.log(testId);

        
        
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
            <strong>تعداد سوالات :</strong>{" "}
            { questions.length}
          </p>
          <p>
            <strong>زمان تقریبیی :</strong>{" "}
            {currentTest.duration?.from && currentTest.duration?.to
              ? `${currentTest.duration.from} الی ${currentTest.duration.to} دقیقه`
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
                  {testId === 'HOLLAND' && <HollandTest  />}
                  {testId === 'GARDNER' && <GardnerTest  />}
                  {testId === 'CLIFTON' && <CliftonTest  />}
                  {testId === 'GHQ' && <GHQTest/>}
                  {testId === 'PERSONAL_FAVORITES' && <PersonalFavoritesTest/>}

                  {/* <button className="submit-button" onClick={finishTest}>Submit Test</button> */}
                </div>
      )}
    </div>
  )
}

export default StarterTestPage
