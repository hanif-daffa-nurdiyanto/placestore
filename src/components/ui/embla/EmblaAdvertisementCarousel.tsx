import type { EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useState } from "react";
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
			className={
				className
					? `embla advertisement-carousel ${className}`
					: "embla advertisement-carousel"
			}
			style={
				{
					"--slide-size": "100%",
					"--slide-spacing": "0px",
				} as React.CSSProperties
			}
		>
			{/** biome-ignore lint/a11y/noStaticElementInteractions: Pointer and focus events pause automatic slide rotation. */}
			<div
				className="embla__viewport advertisement-carousel__viewport"
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
					<div className="advertisement-carousel__dots">
						{scrollSnaps.map((snap, index) => (
							<DotButton
								key={snap}
								onClick={() => onDotButtonClick(index)}
								aria-label={`Go to slide ${index + 1}`}
								aria-current={index === selectedIndex ? "true" : undefined}
								className={`advertisement-carousel__dot${
									index === selectedIndex ? " is-active" : ""
								}`}
							/>
						))}
					</div>
				)}
			</div>

			{scrollSnaps.length > 1 && (
				<div className="advertisement-carousel__arrows">
					<PrevButton
						onClick={onPrevButtonClick}
						disabled={prevBtnDisabled}
						aria-label="Previous slide"
					/>
					<NextButton
						onClick={onNextButtonClick}
						disabled={nextBtnDisabled}
						aria-label="Next slide"
					/>
				</div>
			)}
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
	return (
		<div className="embla__slide flex justify-center">
			<a
				href={slide.url}
				className="advertisement-carousel__slide-link"
				target={slide.url.startsWith("http") ? "_blank" : undefined}
				rel={slide.url.startsWith("http") ? "noreferrer" : undefined}
			>
				<img
					src={slide.imageUrl}
					alt={slide.label}
					loading={isPriority ? "eager" : "lazy"}
					fetchPriority={isPriority ? "high" : "auto"}
					decoding="async"
					className="advertisement-carousel__image"
				/>
			</a>
		</div>
	);
}
