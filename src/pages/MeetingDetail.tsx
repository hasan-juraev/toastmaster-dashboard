import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Meeting } from "../types/database";
import RoleAssignment from "../components/meetings/RoleAssignment";

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();

  const {
    data: meeting,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["meeting", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Meeting;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading meeting details...
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          Error loading meeting details
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <Link
          to="/meetings"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Back to Meetings
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {meeting.theme || "Untitled Meeting"}
            </h1>
            <p className="text-gray-600 mt-1">
              Date: {new Date(meeting.date).toLocaleDateString()}
            </p>
            <p className="text-gray-600 font-medium">
              Location: {meeting.location || "Not set"}
            </p>
          </div>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${
              meeting.status === "completed"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {meeting.status}
          </span>
        </div>
      </div>

      <RoleAssignment meetingId={meeting.id} />

      <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Speeches</h2>
        <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500 border border-dashed border-gray-300">
          Speech tracking coming in Step 4.
        </div>
      </div>
    </div>
  );
}
