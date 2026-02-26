import type { FC } from "hono/jsx";
import { ErrorPage } from "../../components/ui/error-page";

/**
 * Dedicated 404 page component.
 * Renders the shared ErrorPage with status=404.
 */
export const NotFoundPage: FC = () => {
  return <ErrorPage status={404} />;
};
