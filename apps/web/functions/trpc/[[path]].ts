interface PagesEnv {
  API: {
    fetch(request: Request): Promise<Response>;
  };
}

interface PagesContext {
  request: Request;
  env: PagesEnv;
}

export function onRequest({ request, env }: PagesContext): Promise<Response> {
  return env.API.fetch(request);
}