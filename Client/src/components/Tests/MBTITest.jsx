import { useState } from 'react';
import '../../styles/test.scss';

const MBTITest = ({ questions }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  return (
    <div className="test-container">
      <h2>MBTI Personality Test</h2>
      
      <div className="question-container">
        <p>Question {currentQuestion + 1} of {questions.length}</p>
        <h3>{questions[currentQuestion].text}</h3>
        
        <div className="options-grid">
          {questions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              className={`option-button ${
                answers[questions[currentQuestion].id] === option.value ? 'selected' : ''
              }`}
              onClick={() => handleAnswer(questions[currentQuestion].id, option.value)}
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