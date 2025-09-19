// components/User/TestCard.js
import { Link } from 'react-router-dom';
import '../../styles/test-Card.css'

const TestCard = ({ test, onStart }) => {

     const formatDate = (time) =>  new Date(time).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="test-card">
      {/* <img src={test.icon} alt={test.name}/> Testing perposes */}
      <h3>{test.name}</h3>
      <div className="test-meta">
        <span className="deadline">
          تاریخ اتمام: {formatDate(test.deadline)}
        </span>
        <span className="duration">مدت آزمون: {test.duration?.from} تا {test.duration?.to} دقیقه</span>
      </div>
      <div className="test-actions">
        <button 
          onClick={onStart}
          className="start-button"
        >
          شروع آزمون
        </button>
        {/* <Link to={`/test/instructions/${test._id}`} className="view-details">
          مشاهده جزیات
        </Link> */}
      </div>
    </div>
  );
};

export default TestCard;