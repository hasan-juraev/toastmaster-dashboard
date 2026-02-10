import { useState } from "react";
import { useMeetings, useUpdateMeeting } from "../hooks/useMeetings";
import { Link } from "react-router-dom";
import type { Meeting } from "../types/database";
import MeetingForm from "../components/meetings/MeetingForm";

export default function Meetings() {
  const { data: meetings, isLoading, error } = useMeetings();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const updateMeeting = useUpdateMeeting();

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setIsFormOpen(true);
  };

  const handleStatusToggle = async (meeting: Meeting) => {
    const newStatus = meeting.status === "upcoming" ? "completed" : "upcoming";
    try {
      await updateMeeting.mutateAsync({ id: meeting.id, status: newStatus });
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMeeting(null);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading meetings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          Error loading meetings: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add Meeting
        </button>
      </div>

      {isFormOpen && (
        <MeetingForm meeting={editingMeeting} onClose={handleCloseForm} />
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Theme
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {meetings?.map((meeting) => (
              <tr key={meeting.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    to={`/meetings/${meeting.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {new Date(meeting.date).toLocaleDateString()}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {meeting.theme || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {meeting.location || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleStatusToggle(meeting)}
                    className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                      meeting.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                    }`}
                  >
                    {meeting.status}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(meeting)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {meetings?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No meetings found. Create your first meeting to get started.
          </div>
        )}
      </div>
    </div>
  );
}
