import type { EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import "../../../css/embla.css";

import {
	NextButton,
	PrevButton,
	usePrevNextButtons,
} from "./EmblaCarouselArrowButtons";
import { DotButton, useDotButton } from "./EmblaCarouselDotButtons";

export type AdvertisementSlide = {
	id: string;
	label: string;
	imageUrl: string;
	url: string;
};

type Props = {
	slides: AdvertisementSlide[];
	options?: EmblaOptionsType;
	className?: string;
};

export default function EmblaAdvertisementCarousel({
	slides,
	options,
	className,
}: Props) {
	const [isHovering, setIsHovering] = useState(false);
	const [isFocusWithin, setIsFocusWithin] = useState(false);
	const [emblaRef, emblaApi] = useEmblaCarousel({
		align: "center",
		...options,
	});
	const { selectedIndex, scrollSnaps, onDotButtonClick } =
		useDotButton(emblaApi);
	const {
		prevBtnDisabled,
		nextBtnDisabled,
		onPrevButtonClick,
		onNextButtonClick,
	} = usePrevNextButtons(emblaApi);

	useEffect(() => {
		if (!emblaApi) return;
		if (slides.length < 2) return;
		if (isHovering || isFocusWithin) return;

		const api = emblaApi as unknown as Record<string, unknown>;

		const intervalId = window.setInterval(() => {
			if (document.visibilityState === "hidden") return;

			const canGoToNext = api.canGoToNext;
			const canScrollNext = api.canScrollNext;
			const goToNext = api.goToNext;
			const scrollNext = api.scrollNext;
			const goTo = api.goTo;

			const canNext =
				typeof canGoToNext === "function"
					? (canGoToNext as () => boolean)()
					: typeof canScrollNext === "function"
						? (canScrollNext as () => boolean)()
						: true;

			if (!canNext) {
				if (typeof goTo === "function") (goTo as (i: number) => void)(0);
				return;
			}

			if (typeof goToNext === "function") (goToNext as () => void)();
			else if (typeof scrollNext === "function") (scrollNext as () => void)();
		}, 4000);

		return () => window.clearInterval(intervalId);
	}, [emblaApi, isFocusWithin, isHovering, slides.length]);

	return (
		<div
			className={className ? `embla ${className}` : "embla"}
			style={
				{
					"--slide-size": "100%",
					"--slide-spacing": "0px",
				} as React.CSSProperties
			}
		>
			{/** biome-ignore lint/a11y/noStaticElementInteractions: <explanation> */}
			<div
				className="embla__viewport relative group"
				ref={emblaRef}
				onMouseEnter={() => setIsHovering(true)}
				onMouseLeave={() => setIsHovering(false)}
				onFocusCapture={() => setIsFocusWithin(true)}
				onBlurCapture={(e) => {
					const nextTarget = e.relatedTarget as Node | null;
					if (nextTarget && e.currentTarget.contains(nextTarget)) return;
					setIsFocusWithin(false);
				}}
			>
				<div className="embla__container">
					{slides.map((slide, index) => (
						<AdvertisementSlideItem
							key={slide.id}
							slide={slide}
							isPriority={index === 0}
						/>
					))}
				</div>

				{scrollSnaps.length > 1 && (
					<div className="pointer-events-none absolute inset-0">
						<div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
							<div className="pointer-events-auto">
								<PrevButton
									onClick={onPrevButtonClick}
									disabled={prevBtnDisabled}
									aria-label="Previous slide"
								/>
							</div>
							<div className="pointer-events-auto">
								<NextButton
									onClick={onNextButtonClick}
									disabled={nextBtnDisabled}
									aria-label="Next slide"
								/>
							</div>
						</div>

						<div className="absolute left-1/2 bottom-2 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
							<div className="pointer-events-auto flex gap-2 rounded-full px-2 py-1">
								{scrollSnaps.map((snap, index) => (
									<DotButton
										key={snap}
										onClick={() => onDotButtonClick(index)}
										aria-label={`Go to slide ${index + 1}`}
										className={`h-2.5 w-2.5 rounded-full transition-colors ${
											index === selectedIndex ? "bg-white" : "bg-white/50"
										}`}
									/>
								))}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function AdvertisementSlideItem({
	slide,
	isPriority,
}: {
	slide: AdvertisementSlide;
	isPriority: boolean;
}) {
	const [aspectRatio, setAspectRatio] = useState<number | null>(null);

	const onImageLoad = useCallback(
		(event: React.SyntheticEvent<HTMLImageElement>) => {
			const img = event.currentTarget;
			if (!img.naturalWidth || !img.naturalHeight) return;
			setAspectRatio(img.naturalWidth / img.naturalHeight);
		},
		[],
	);

	return (
		<div className="embla__slide flex justify-center">
			<a
				href={slide.url}
				className="inline-block overflow-hidden border bg-slate-50 h-[220px] sm:h-[280px] md:h-[320px] w-[100vw] max-w-none"
				style={
					aspectRatio ? ({ aspectRatio } as React.CSSProperties) : undefined
				}
				target={slide.url.startsWith("http") ? "_blank" : undefined}
				rel={slide.url.startsWith("http") ? "noreferrer" : undefined}
			>
				<img
					src={slide.imageUrl}
					alt={slide.label}
					loading={isPriority ? "eager" : "lazy"}
					fetchPriority={isPriority ? "high" : "auto"}
					decoding="async"
					onLoad={onImageLoad}
					className="block h-full w-full object-cover"
				/>
			</a>
		</div>
	);
}
