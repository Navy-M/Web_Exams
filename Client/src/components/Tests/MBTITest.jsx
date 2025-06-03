import { useState } from 'react';
import '../../styles/test.css';
import { Mbti_Test } from '../../services/dummyData';

const MBTITest = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  return (
    <div className="test-container">
      <h2>MBTI Personality Test</h2>
      
      <div className="question-container">
        <p>Question {currentQuestion + 1} of {Mbti_Test.length}</p>
        <h3>{Mbti_Test[currentQuestion].text}</h3>
        
        <div className="options-grid">
          {Mbti_Test[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              className={`option-button ${
                answers[Mbti_Test[currentQuestion].id] === option.value ? 'selected' : ''
              }`}
              onClick={() => handleAnswer(Mbti_Test[currentQuestion].id, option.value)}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MBTITest;