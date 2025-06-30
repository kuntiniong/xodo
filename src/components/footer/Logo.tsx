import Image from "next/image";

export default function Logo() {
  return (
    <div className="flex items-center justify-center">
      <Image src="/favicon.png" alt="Favicon" width={200} height={200} />
    </div>
  );
}