import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-4 text-gray-600">
        Welcome to Toastmasters Meeting Tracker
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/members"
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-900">Members</h2>
          <p className="mt-2 text-gray-600">Manage club members</p>
        </Link>

        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
          <h2 className="text-xl font-semibold text-gray-900">Meetings</h2>
          <p className="mt-2 text-gray-600">Coming soon</p>
        </div>

        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
          <h2 className="text-xl font-semibold text-gray-900">Reports</h2>
          <p className="mt-2 text-gray-600">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
