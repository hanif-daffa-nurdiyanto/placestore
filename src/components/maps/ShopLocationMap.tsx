import "leaflet/dist/leaflet.css";

import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useEffect, useMemo } from "react";
import {
	MapContainer,
	Marker,
	TileLayer,
	useMap,
	useMapEvents,
} from "react-leaflet";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
	._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: markerIcon2x,
	iconUrl: markerIcon,
	shadowUrl: markerShadow,
});

export type LatLng = { lat: number; lng: number };

function ClickToSetMarker(props: { onPick: (value: LatLng) => void }) {
	useMapEvents({
		click: (e) => {
			props.onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
		},
	});
	return null;
}

function RecenterOnValue(props: { value: LatLng | null }) {
	const map = useMap();
	useEffect(() => {
		if (!props.value) return;
		map.setView(props.value, Math.max(map.getZoom(), 15), { animate: true });
	}, [map, props.value]);
	return null;
}

export default function ShopLocationMap(props: {
	value: LatLng | null;
	onChange: (value: LatLng) => void;
	className?: string;
}) {
	const center = useMemo<LatLng>(
		() => props.value ?? { lat: -6.2, lng: 106.816666 }, // Jakarta default
		[props.value],
	);

	return (
		<div className={props.className}>
			<MapContainer
				center={center}
				zoom={props.value ? 15 : 11}
				scrollWheelZoom
				className="h-80 w-full rounded-xl border overflow-hidden"
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<ClickToSetMarker onPick={props.onChange} />
				<RecenterOnValue value={props.value} />
				{props.value && <Marker position={props.value} />}
			</MapContainer>
		</div>
	);
}
