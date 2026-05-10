import type { User } from "../../types";

interface AvatarProps {
  user: User | undefined | null;
  size?: "xs" | "sm" | "md" | "lg";
}

const SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
};

export function Avatar({ user, size = "sm" }: AvatarProps) {
  if (!user) return <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200" />;
  return (
    <div
      className={`${SIZES[size]} rounded-full ${user.color} flex items-center justify-center font-semibold border border-white shadow-sm`}
    >
      {user.avatar}
    </div>
  );
}
