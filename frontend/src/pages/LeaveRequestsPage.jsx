// src/pages/LeaveRequestsPage.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './styles/ManagerDashboard.css';

const LeaveRequestsPage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const managerId = 2; // Update to dynamic if needed

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/leave/manager/${managerId}`);
        setLeaveRequests(res.data);
      } catch (err) {
        console.error('Error fetching leave requests:', err);
      }
    };

    fetchLeaveRequests();
  }, []);

  return (
    <div className="leave-requests">
      <h2>Leave Requests</h2>
      {leaveRequests.length === 0 ? (
        <p>No leave requests submitted.</p>
      ) : (
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {leaveRequests.map((req, index) => (
              <tr key={index}>
                <td>{req.username}</td>
                <td>{new Date(req.start_date).toLocaleDateString()}</td>
                <td>{new Date(req.end_date).toLocaleDateString()}</td>
                <td>{req.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LeaveRequestsPage;
