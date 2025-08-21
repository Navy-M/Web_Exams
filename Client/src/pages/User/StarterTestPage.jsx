import React, {useEffect, useState} from 'react'
import { Test_Cards } from '../../services/dummyData';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import "../../styles/starterTestPage.css";
import DiscTest from '../../components/Tests/DISCTest';
import HollandTest from '../../components/Tests/HollandTest';
import GardnerTest from '../../components/Tests/GardnerTest';
import MBTITest from '../../components/Tests/MBTITest';
import CliftonTest from '../../components/Tests/CliftonTest';
import GHQTest from '../../components/Tests/GHQTest';
import PersonalFavoritesTest from '../../components/Tests/PersonalFavoritesTest';
import {getTestQuestions} from "../../services/api"; // your axios setup

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
      // try {
        
      // } catch (error) {
      //   console.error("fetch questions error: ", error);
      // }

      setStarted(true);
    };

    const handleBackDash = () => {
      // alert("back home");
      navigate('/users/dashboard'); 
    }

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

          const qs = await getTestQuestions (foundTest.id);
          // console.log("downloaded questions : ", qs.questions);
          setQuestions(qs.questions);

          

          // Fill user Tests Data
          const completed  = user?.testsAssigned || [];
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
          <h3>{currentTest.description}</h3>
          <p>
            <strong>تعداد سوالات :</strong>{" "}
            { questions.length} سوال
          </p>
          <p>
            <strong>زمان تقریبیی :</strong>{" "}
            {currentTest.duration?.from && currentTest.duration?.to
              ? `${currentTest.duration.from} الی ${currentTest.duration.to} دقیقه`
              : "Not specified"}
          </p>
          <div className='button-container'>
            <button className="back-button" onClick={handleBackDash}>
              بازگشت
            </button>
            <button className="start-button" onClick={handleStart}>
              Start Test
            </button>
            
          </div>
        </>
      ) : (
          <div className="test-interface">
                  {/* <h2>{currentTest.name}</h2> */}
                  {/* <p>{JSON.stringify(questions)}</p> */}

                  {testId === 'MBTI' && <MBTITest  questions={questions}/>}
                  {testId === 'DISC' && <DiscTest  questions={questions}/>}
                  {testId === 'HOLLAND' && <HollandTest questions={questions} />}
                  {testId === 'GARDNER' && <GardnerTest questions={questions} />}
                  {testId === 'CLIFTON' && <CliftonTest questions={questions} />}
                  {testId === 'GHQ' && <GHQTest questions={questions}/>}
                  {testId === 'PERSONAL_FAVORITES' && <PersonalFavoritesTest questions={questions}/>}

                  {/* <button className="submit-button" onClick={finishTest}>Submit Test</button> */}
                </div>
      )}
    </div>
  )
}

export default StarterTestPage
