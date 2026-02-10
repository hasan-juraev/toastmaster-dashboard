import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateMeeting, useUpdateMeeting } from "../../hooks/useMeetings";
import type { Meeting } from "../../types/database";

const meetingSchema = z.object({
  date: z.string().min(1, "Date is required"),
  theme: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  status: z.enum(["upcoming", "completed"]).optional(),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

interface MeetingFormProps {
  meeting?: Meeting | null;
  onClose: () => void;
}

export default function MeetingForm({ meeting, onClose }: MeetingFormProps) {
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      date: meeting?.date || "",
      theme: meeting?.theme || "",
      location: meeting?.location || "",
      status: (meeting?.status as "upcoming" | "completed") || "upcoming",
    },
  });

  const onSubmit = async (data: MeetingFormData) => {
    try {
      const payload = {
        date: data.date,
        theme: data.theme || null,
        location: data.location || null,
        status: data.status,
      };

      if (meeting) {
        await updateMeeting.mutateAsync({ id: meeting.id, ...payload });
      } else {
        await createMeeting.mutateAsync(payload);
      }
      onClose();
    } catch (error) {
      console.error("Error saving meeting:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {meeting ? "Edit Meeting" : "Add Meeting"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700"
            >
              Date *
            </label>
            <input
              id="date"
              type="date"
              {...register("date")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="theme"
              className="block text-sm font-medium text-gray-700"
            >
              Theme
            </label>
            <input
              id="theme"
              type="text"
              {...register("theme")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700"
            >
              Location
            </label>
            <input
              id="location"
              type="text"
              {...register("location")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {meeting && (
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700"
              >
                Status
              </label>
              <select
                id="status"
                {...register("status")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : meeting ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
