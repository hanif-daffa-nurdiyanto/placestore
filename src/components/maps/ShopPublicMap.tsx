import "leaflet/dist/leaflet.css";

import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
	._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: markerIcon2x,
	iconUrl: markerIcon,
	shadowUrl: markerShadow,
});

export type LatLng = { lat: number; lng: number };

export default function ShopPublicMap(props: { location: LatLng }) {
	return (
		<MapContainer
			center={props.location}
			zoom={15}
			scrollWheelZoom={false}
			dragging
			className="h-80 w-full rounded-xl border overflow-hidden"
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			<Marker position={props.location} />
		</MapContainer>
	);
}

