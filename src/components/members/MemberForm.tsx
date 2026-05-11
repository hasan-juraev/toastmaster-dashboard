import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateMember, useUpdateMember } from "../../hooks/useMembers";
import type { Member } from "../../types/database";

const memberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  active: z.boolean(),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface MemberFormProps {
  member?: Member | null;
  onClose: () => void;
}

export default function MemberForm({ member, onClose }: MemberFormProps) {
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: member?.name || "",
      email: member?.email || "",
      active: member?.active ?? true,
    },
  });

  const onSubmit = async (data: MemberFormData) => {
    try {
      const payload = {
        name: data.name,
        email: data.email || null,
        active: data.active,
      };

      if (member) {
        await updateMember.mutateAsync({ id: member.id, ...payload });
      } else {
        await createMember.mutateAsync(payload);
      }
      onClose();
    } catch (error) {
      console.error("Error saving member:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/25 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-[1.75rem] border border-app-border bg-app-panel p-5 shadow-app-card sm:p-6">
        <p className="app-eyebrow">Member</p>
        <h2 className="mb-4 mt-2 text-2xl font-bold text-app-text">
          {member ? "Edit Member" : "Add Member"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-app-text-muted"
            >
              Name *
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className="mt-1 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-app-text placeholder:text-app-text-subtle"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-app-text-muted"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="mt-1 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-app-text placeholder:text-app-text-subtle"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex items-center rounded-xl bg-slate-50 px-3 py-3">
            <input
              id="active"
              type="checkbox"
              {...register("active")}
              className="h-4 w-4 rounded border-app-border bg-app-panel-soft text-primary"
            />
            <label
              htmlFor="active"
              className="ml-2 block text-sm text-app-text-muted"
            >
              Active
            </label>
          </div>

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
              {isSubmitting ? "Saving..." : member ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
