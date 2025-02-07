"use client";

import { SocketUserLoader } from "@/components/socket-user-loader";
import { Center, Spinner } from "@chakra-ui/react";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<Center w="100%" h="100vh"><Spinner /></Center>}>
      <SocketUserLoader />
    </Suspense>
  )
}