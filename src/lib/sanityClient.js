import { createClient } from "@sanity/client";

const client = createClient({
    projectId: "u3sjk6y6",
    dataset: "production",
    useCdn: true,
    apiVersion: "2024-01-01",
});

export default client;