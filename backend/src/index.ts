import "dotenv/config"
import app from "./app.js"

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
});


const PORT = process.env.PORT

app.listen(PORT, () => {
    console.log("server is running on port 3000")
})