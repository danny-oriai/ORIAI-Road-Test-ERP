import { USERS } from "../mock/users";
import { PROJECTS } from "../mock/projects";
import { VEHICLES } from "../mock/vehicles";
import { PLATES } from "../mock/plates";
import { ROUTES } from "../mock/routes";
import type { User, Project, Vehicle, Plate, Route } from "../types";

export const userById     = (id: string | null | undefined): User | undefined    => USERS.find((u) => u.id === id);
export const projectById  = (id: string | null | undefined): Project | undefined => PROJECTS.find((p) => p.id === id);
export const vehicleById  = (id: string | null | undefined): Vehicle | undefined => VEHICLES.find((v) => v.id === id);
export const plateById    = (id: string | null | undefined): Plate | undefined   => PLATES.find((p) => p.id === id);
export const routeById    = (id: string | null | undefined): Route | undefined   => ROUTES.find((r) => r.id === id);
