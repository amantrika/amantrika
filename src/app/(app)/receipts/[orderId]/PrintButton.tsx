"use client";

import { Download } from "lucide-react";
import { Button } from "@/design-system/components";

/**
 * "Save as PDF" rather than a server-generated file: every browser and phone can
 * print a page to PDF, and the print stylesheet already strips the navigation.
 * One fewer dependency, and the result is a document the customer chose the name
 * and location of.
 */
export function PrintButton() {
  return (
    <Button size="sm" variant="secondary" onClick={() => window.print()}>
      <Download className="size-4" /> Download / print
    </Button>
  );
}
