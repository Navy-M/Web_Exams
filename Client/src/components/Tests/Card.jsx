// components/Card.jsx
import React from "react";
import "../../styles/TestCard.css"; 

const Card = ({ title, description, children }) => {
  return (
    <div className="custom-card">
      <h3 className="card-title">{title}</h3>
      <p className="card-description">{description}</p>
      {children && <div className="card-content">{children}</div>}
    </div>
  );
};

export default Card;
