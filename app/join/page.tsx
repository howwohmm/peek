"use client";

import { useState } from "react";
import { JoinForm } from "@/components/student/JoinForm";
import { StudentRoom } from "@/components/student/StudentRoom";
import type { JoinClassResponse } from "@/lib/types";

type Connection = JoinClassResponse & { name: string };

export default function JoinPage() {
  const [connection, setConnection] = useState<Connection | null>(null);

  if (connection) {
    return (
      <StudentRoom
        code={connection.code}
        token={connection.token}
        url={connection.url}
        identity={connection.identity}
        name={connection.name}
        onLeave={() => setConnection(null)}
      />
    );
  }

  return <JoinForm onJoin={setConnection} />;
}
