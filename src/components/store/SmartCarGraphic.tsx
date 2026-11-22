import type React from "react";
import { getVehicleSpec } from "../../config/vehicleSpecs.ts";

export interface SmartCarGraphicProps {
  className?: string;
  style?: React.CSSProperties;
  carId?: string;
}

/**
 * Pixel-perfect Car graphic with wheels positioned exactly
 * at the tire centers of vehicle body assets (1024x567).
 */
export const SmartCarGraphic: React.FC<SmartCarGraphicProps> = ({
  className = "",
  style,
  carId = "smart_car",
}) => {
  let viewBox = "65 110 870 460";
  let bodyWidth = 1024;
  let bodyHeight = 567;
  let bodyHref = "./vehicles/blue_coupe_body.png";
  let wheelHref = "./vehicles/blue_coupe_wheel.png";
  let rearWheel = { x: 40, y: 324, size: 216 };
  let frontWheel = { x: 710, y: 324, size: 216 };

  if (carId === "army_truck") {
    viewBox = "0 0 1376 768";
    bodyWidth = 1376;
    bodyHeight = 768;
    bodyHref = "./vehicles/army_truck_body.png";
    wheelHref = "./vehicles/army_truck_wheel.png";
    rearWheel = { x: 191, y: 512, size: 245 };
    frontWheel = { x: 933, y: 512, size: 245 };
  } else if (carId === "smart_car") {
    // Zoomed viewBox to match delivery & army truck card coverage
    viewBox = "65 110 870 460";
    bodyWidth = 1024;
    bodyHeight = 567;
    bodyHref = "./vehicles/blue_coupe_body.png";
    wheelHref = "./vehicles/blue_coupe_wheel.png";
    rearWheel = { x: 40, y: 324, size: 216 };
    frontWheel = { x: 710, y: 324, size: 216 };
  } else if (carId === "sports_coupe") {
    // Zoomed viewBox to eliminate excessive vertical whitespace
    viewBox = "75 130 830 440";
    bodyWidth = 1024;
    bodyHeight = 567;
    bodyHref = "./vehicles/sports_coupe_body.png";
    wheelHref = "./vehicles/sports_coupe_wheel.png";
    rearWheel = { x: 125, y: 337, size: 205 };
    frontWheel = { x: 670, y: 337, size: 205 };
  } else if (carId === "delivery_truck") {
    viewBox = "0 0 1686 933";
    bodyWidth = 1686;
    bodyHeight = 933;
    bodyHref = "./vehicles/delivery_truck_body.png";
    wheelHref = "./vehicles/delivery_truck_wheel.png";
    rearWheel = { x: 179, y: 615, size: 260 };
    frontWheel = { x: 1278, y: 617, size: 260 };
  } else if (carId === "dirt_bike") {
    // Calibrated framing to match truck visual presence
    viewBox = "40 40 940 560";
    bodyWidth = 1024;
    bodyHeight = 571;
    bodyHref = "./vehicles/dirt_bike_body.png";
    wheelHref = "./vehicles/dirt_bike_wheel.png";
    const spec = getVehicleSpec(carId);
    const gameRenderScale = 1.2;
    const scaleX = bodyWidth / (spec.baseWidth * gameRenderScale);
    const scaleY = bodyHeight / (spec.baseHeight * gameRenderScale);
    const wheelSize = spec.wheelRadius * 2 * spec.wheelScale * gameRenderScale * scaleX;
    rearWheel = {
      x: bodyWidth / 2 + (spec.rearAxle.x - spec.bodyOffsetX * gameRenderScale) * scaleX - wheelSize / 2,
      y: bodyHeight / 2 + (spec.rearAxle.y - spec.bodyOffsetY * gameRenderScale) * scaleY - wheelSize / 2,
      size: wheelSize
    };
    frontWheel = {
      x: bodyWidth / 2 + (spec.frontAxle.x - spec.bodyOffsetX * gameRenderScale) * scaleX - wheelSize / 2,
      y: bodyHeight / 2 + (spec.frontAxle.y - spec.bodyOffsetY * gameRenderScale) * scaleY - wheelSize / 2,
      size: wheelSize
    };
  } else if (carId === "super_bike") {
    // Calibrated framing to match truck visual presence
    viewBox = "55 25 910 510";
    bodyWidth = 1024;
    bodyHeight = 571;
    bodyHref = "./vehicles/super_bike_body.png";
    wheelHref = "./vehicles/super_bike_wheel.png";
    const spec = getVehicleSpec(carId);
    const gameRenderScale = 1.2;
    const scaleX = bodyWidth / (spec.baseWidth * gameRenderScale);
    const scaleY = bodyHeight / (spec.baseHeight * gameRenderScale);
    const wheelSize = spec.wheelRadius * 2 * spec.wheelScale * gameRenderScale * scaleX;
    rearWheel = {
      x: bodyWidth / 2 + (spec.rearAxle.x - spec.bodyOffsetX * gameRenderScale) * scaleX - wheelSize / 2,
      y: bodyHeight / 2 + (spec.rearAxle.y - spec.bodyOffsetY * gameRenderScale) * scaleY - wheelSize / 2,
      size: wheelSize
    };
    frontWheel = {
      x: bodyWidth / 2 + (spec.frontAxle.x - spec.bodyOffsetX * gameRenderScale) * scaleX - wheelSize / 2,
      y: bodyHeight / 2 + (spec.frontAxle.y - spec.bodyOffsetY * gameRenderScale) * scaleY - wheelSize / 2,
      size: wheelSize
    };
  } else {
    // Default: smart_car
    viewBox = "65 110 870 460";
    bodyWidth = 1024;
    bodyHeight = 567;
    bodyHref = "./vehicles/blue_coupe_body.png";
    wheelHref = "./vehicles/blue_coupe_wheel.png";
    rearWheel = { x: 40, y: 324, size: 216 };
    frontWheel = { x: 710, y: 324, size: 216 };
  }

  const isBike = carId === "dirt_bike" || carId === "super_bike";
  const wheelElements = (
    <>
      <image
        href={wheelHref}
        x={rearWheel.x}
        y={rearWheel.y}
        width={rearWheel.size}
        height={rearWheel.size}
      />
      <image
        href={wheelHref}
        x={frontWheel.x}
        y={frontWheel.y}
        width={frontWheel.size}
        height={frontWheel.size}
      />
    </>
  );

  const bodyElement = (
    <image
      href={bodyHref}
      x="0"
      y="0"
      width={bodyWidth}
      height={bodyHeight}
    />
  );

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={`smart-car-graphic ${className}`}
      style={{
        display: "block",
        overflow: "visible",
        ...style,
      }}
    >
      {isBike ? (
        <>
          {wheelElements}
          {bodyElement}
        </>
      ) : (
        <>
          {bodyElement}
          {wheelElements}
        </>
      )}
    </svg>
  );
};
