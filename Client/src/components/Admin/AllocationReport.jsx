import React, { useRef } from "react";
import "./AllocationReport.css";

const AllocationReport = ({ selectedUsers, assignmentResult }) => {
  const containerRef = useRef();
  const currentDate = new Date().toLocaleDateString("fa-IR");



  const handlePrint = () => {
    const printContents = containerRef.current.innerHTML;
    const win = window.open("", "", "width=900,height=650");
    win.document.write(`
      <html>
        <head>
          <title>گزارش اولویت‌بندی</title>
          <link rel="stylesheet" href="AllocationReport.css" />
          <style>
            body { font-family: Tahoma, sans-serif; direction: rtl; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    win.document.close();
    win.print();
    win.close();
  };

  return (
    <div>
      <div className="allocation-header">
        <h2>گزارش اولویت‌بندی مشاغل</h2>
        <button className="print-button" onClick={handlePrint}>
          چاپ گزارش
        </button>
      </div>

      <div ref={containerRef} className="allocation-container">
        <p className="allocation-date">تاریخ: {currentDate}</p>

        <table className="allocation-table">
          <thead>
            <tr>
              <th>ردیف</th>
              <th>شغل</th>
              <th>نام کاربر</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(assignmentResult.allocations).map(
              ([jobKey, jobData], jobIndex) =>
                jobData.persons?.map((person, personIndex) => {
                  const personId = person.id || person._id || person;
                  const user = selectedUsers.find(
                    (u) => u.id === personId || u._id === personId
                  );
                //   console.log(user);
                  
                  return (
                    <tr key={`${jobKey}-${personId}`}>
                      <td>{`${jobIndex + 1}.${personIndex + 1}`}</td>
                      <td>{jobData.name || jobKey}</td>
                      <td>{user?.profile?.fullName || "بدون نام"}</td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllocationReport;
