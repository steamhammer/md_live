import {Response} from "express";

export const sseClients = new Set<Response>();

export function notifyClients(filePath: string, routePath: string) {
  const message = JSON.stringify({
    type: 'file-changed',
    path: routePath,
    filePath
  });

  sseClients.forEach((client) => {
    client.write(`data: ${message}\n\n`);
  });

  console.log(`Notified ${sseClients.size} client(s) about change: ${routePath}`);
}