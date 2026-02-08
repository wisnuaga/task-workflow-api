import "dotenv/config";
import { buildApp } from "./app";

const app = buildApp();

app.listen({ port: 3000 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
});
