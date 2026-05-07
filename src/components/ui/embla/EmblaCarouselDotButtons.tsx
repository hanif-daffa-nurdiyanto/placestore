import type { EmblaCarouselType } from "embla-carousel";
import {
	type ComponentPropsWithRef,
	useCallback,
	useEffect,
	useState,
} from "react";

type UseDotButtonType = {
	selectedIndex: number;
	scrollSnaps: number[];
	onDotButtonClick: (index: number) => void;
};

export const useDotButton = (
	emblaApi: EmblaCarouselType | undefined,
): UseDotButtonType => {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

	const onDotButtonClick = useCallback(
		(index: number) => {
			if (!emblaApi) return;
			const api = emblaApi as unknown as Record<string, unknown>;
			const goTo = api.goTo;
			const scrollTo = api.scrollTo;
			if (typeof goTo === "function") (goTo as (i: number) => void)(index);
			else if (typeof scrollTo === "function")
				(scrollTo as (i: number) => void)(index);
		},
		[emblaApi],
	);

	const onInit = useCallback((emblaApi: EmblaCarouselType) => {
		const api = emblaApi as unknown as Record<string, unknown>;
		const snapList = api.snapList;
		const scrollSnapList = api.scrollSnapList;
		if (typeof snapList === "function") setScrollSnaps((snapList as () => number[])());
		else if (typeof scrollSnapList === "function")
			setScrollSnaps((scrollSnapList as () => number[])());
		else setScrollSnaps([]);
	}, []);

	const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
		const api = emblaApi as unknown as Record<string, unknown>;
		const selectedSnap = api.selectedSnap;
		const selectedScrollSnap = api.selectedScrollSnap;
		if (typeof selectedSnap === "function")
			setSelectedIndex((selectedSnap as () => number)());
		else if (typeof selectedScrollSnap === "function")
			setSelectedIndex((selectedScrollSnap as () => number)());
	}, []);

	useEffect(() => {
		if (!emblaApi) return;

		onInit(emblaApi);
		onSelect(emblaApi);

		emblaApi.on("reinit", onInit).on("reinit", onSelect).on("select", onSelect);
	}, [emblaApi, onInit, onSelect]);

	return {
		selectedIndex,
		scrollSnaps,
		onDotButtonClick,
	};
};

type PropType = ComponentPropsWithRef<"button">;

export const DotButton = (props: PropType) => {
	const { children, ...restProps } = props;

	return (
		<button type="button" className="bg-blue-400"{...restProps}>
		</button>
	);
};
