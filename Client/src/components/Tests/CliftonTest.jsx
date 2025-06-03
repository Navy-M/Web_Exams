// src/components/Tests/CliftonTest.jsx
import { useState } from 'react';
import '../../styles/test.css';              // re‑use your existing test styles
import { Clifton_Test } from '../../services/dummyData';

const CliftonTest = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});   // { questionId: chosenTheme }

  const currentQ = Clifton_Test[currentIndex];

  /** Handle click on either statement */
  const handleSelect = (theme) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: theme }));

    // Auto‑advance to next statement (or finish if last)
    if (currentIndex + 1 < Clifton_Test.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      console.log('✅ Clifton answers:', {
        ...answers,
        [currentQ.id]: theme,
      });
      alert('آزمون تمام شد!');
      // TODO: send `answers` to the server or navigate to a summary page
    }
  };

  return (
    <div className="test-container">

      <div className="question-container">
        
        {/* Two‑column grid for the A/B statements */}
        <div className="options-grid two-col">
          <button
            className={`option-button ${
              answers[currentQ.id] === currentQ.theme_a ? 'selected' : ''
            }`}
            onClick={() => handleSelect(currentQ.theme_a)}
          >
            {currentQ.statement_a}
          </button>

          <button
            className={`option-button ${
              answers[currentQ.id] === currentQ.theme_b ? 'selected' : ''
            }`}
            onClick={() => handleSelect(currentQ.theme_b)}
          >
            {currentQ.statement_b}
          </button>
        </div>
      </div>
      <p> Statement&nbsp;{currentIndex + 1}&nbsp;of&nbsp;{Clifton_Test.length}</p>
    </div>
  );
};

export default CliftonTest;
