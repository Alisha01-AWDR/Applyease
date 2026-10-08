import { Link } from 'react-router-dom';

export default function JobNotFound() {
  return (
    <div className="page">
      <div className="empty-state">
        <h1>We could not find that job.</h1>
        <p>It may have been removed, or the link may be incomplete.</p>
        <Link to="/jobs" className="btn primary">
          Back to jobs
        </Link>
      </div>
    </div>
  );
}
