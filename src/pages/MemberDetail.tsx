import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Member } from "../types/database";

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();

  const {
    data: member,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["member", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Member;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading member details...</div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          Error loading member details
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/members" className="text-blue-600 hover:text-blue-800">
          ← Back to Members
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{member.name}</h1>
            <p className="text-gray-600 mt-1">{member.email || "No email"}</p>
          </div>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${
              member.active
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {member.active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Speeches</div>
              <div className="text-2xl font-bold text-gray-900">-</div>
              <div className="text-xs text-gray-500 mt-1">Coming soon</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Roles Filled</div>
              <div className="text-2xl font-bold text-gray-900">-</div>
              <div className="text-xs text-gray-500 mt-1">Coming soon</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Meetings Attended</div>
              <div className="text-2xl font-bold text-gray-900">-</div>
              <div className="text-xs text-gray-500 mt-1">Coming soon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
