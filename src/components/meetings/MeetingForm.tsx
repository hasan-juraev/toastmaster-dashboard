import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateMeeting, useUpdateMeeting } from "../../hooks/useMeetings";
import type { Meeting } from "../../types/database";

const meetingSchema = z.object({
  date: z.string().min(1, "Date is required"),
  theme: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  status: z.enum(["upcoming", "in_progress", "completed", "cancelled"]).optional(),
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
      status: meeting?.status || "upcoming",
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/25 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-[1.75rem] border border-app-border bg-app-panel p-5 shadow-app-card sm:p-6">
        <p className="app-eyebrow">Meeting</p>
        <h2 className="mb-4 mt-2 text-2xl font-bold text-app-text">
          {meeting ? "Edit Meeting" : "Add Meeting"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-app-text-muted"
            >
              Date *
            </label>
            <input
              id="date"
              type="date"
              {...register("date")}
              className="mt-1 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-app-text"
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="theme"
              className="block text-sm font-medium text-app-text-muted"
            >
              Theme
            </label>
            <input
              id="theme"
              type="text"
              {...register("theme")}
              className="mt-1 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-app-text placeholder:text-app-text-subtle"
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-app-text-muted"
            >
              Location
            </label>
            <input
              id="location"
              type="text"
              {...register("location")}
              className="mt-1 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-app-text placeholder:text-app-text-subtle"
            />
          </div>

          {meeting && (
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-app-text-muted"
              >
                Status
              </label>
              <select
                id="status"
                {...register("status")}
                className="mt-1 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-app-text"
              >
                <option value="upcoming">Upcoming</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-app-border px-4 py-3 text-app-text-muted transition hover:bg-app-panel-soft"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : meeting ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
