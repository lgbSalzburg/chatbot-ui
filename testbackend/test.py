#!/usr/bin/env python

import asyncio
import websockets
import os
import json
from contextlib import asynccontextmanager

def build_login_request_payload(message: str) -> str | None:
    try:
        parsed = json.loads(message)
        if isinstance(parsed, dict):
            event_type = str(parsed.get("type") or parsed.get("event") or "").lower()
            if "login" in event_type and "request" in event_type:
                return json.dumps(
                    {
                        "type": "login_request",
                        "message": parsed.get("message") or "Please log in to continue.",
                    }
                )
    except json.JSONDecodeError:
        pass

    if "login_request" in message.lower():
        return json.dumps(
            {
                "type": "login_request",
                "message": "Please log in to continue.",
            }
        )

    return None

async def echo(websocket):  # Removed 'path' parameter as it's no longer needed in newer websockets versions
    try:
        async for message in websocket:
            print("Received message:", message, flush=True)

            login_request_payload = build_login_request_payload(message)
            if login_request_payload:
                await websocket.send(login_request_payload)
                await websocket.send("[END]")
                continue

            # Echo the message back
            await websocket.send(message)
            await websocket.send("[END]")
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected", flush=True)
    except Exception as e:
        print(f"Error: {e}", flush=True)

async def main():
    print("WebSocket server starting", flush=True)

    primary_port = int(os.environ.get("PORT", 8090))
    fallback_port = int(os.environ.get("FALLBACK_PORT", 8091))
    ports_to_try = [primary_port]
    if fallback_port != primary_port:
        ports_to_try.append(fallback_port)

    @asynccontextmanager
    async def start_server(port: int):
        async with websockets.serve(
            echo,
            "0.0.0.0",
            port
        ) as server:
            yield server

    last_error = None
    for index, port in enumerate(ports_to_try):
        try:
            async with start_server(port):
                print(f"WebSocket server running on port {port}", flush=True)
                await asyncio.Future()  # run forever
        except OSError as error:
            last_error = error
            if index < len(ports_to_try) - 1:
                print(
                    f"Port {port} is unavailable ({error}). Trying next port...",
                    flush=True
                )
            else:
                print(
                    f"Port {port} is unavailable ({error}).",
                    flush=True
                )
            continue

    raise RuntimeError(
        f"Could not start WebSocket server on ports {ports_to_try}. "
        f"Last error: {last_error}"
    )

if __name__ == "__main__":
    asyncio.run(main())
