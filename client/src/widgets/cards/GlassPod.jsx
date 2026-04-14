import React from "react";
import { Card, CardBody, Typography } from "@material-tailwind/react";

export function GlassPod({ title, value, footer, icon, className = "", children }) {
  return (
    <Card className={`glass-card overflow-hidden border-none ${className}`}>
      <CardBody className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-1">
            <Typography variant="small" className="font-arabic text-blue-gray-600 opacity-80 uppercase font-bold tracking-wider">
              {title}
            </Typography>
            <Typography variant="h3" color="blue-gray" className="font-arabic font-black">
              {value}
            </Typography>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 shadow-blue-500/10 shadow-lg">
            {icon}
          </div>
        </div>
        
        {children}

        {footer && (
          <div className="mt-4 pt-4 border-t border-blue-gray-50">
            {footer}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default GlassPod;
