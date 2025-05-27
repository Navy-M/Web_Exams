// components/User/TestCard.js
import { Link } from 'react-router-dom';
import '../../styles/test-Card.scss'

const TestCard = ({ test, onStart }) => {
  return (
    <div className="test-card">
      <h3>{test.name}</h3>
      <div className="test-meta">
        <span className="deadline">
          Deadline: {new Date(test.deadline).toLocaleDateString()}
        </span>
        <span className="duration">Duration: {test.duration} mins</span>
      </div>
      <div className="test-actions">
        <button 
          onClick={onStart}
          className="start-button"
        >
          Start Test
        </button>
        <Link to={`/test/instructions/${test._id}`} className="view-details">
          View Details
        </Link>
      </div>
    </div>
  );
};

export default TestCard;