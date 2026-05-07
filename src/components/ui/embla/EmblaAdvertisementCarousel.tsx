import type { EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import "../../../css/embla.css";

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
	const [emblaRef, emblaApi] = useEmblaCarousel({
		align: "center",
		...options,
	});
	const { selectedIndex, scrollSnaps, onDotButtonClick } =
		useDotButton(emblaApi);

	useEffect(() => {
		if (!emblaApi) return;
		if (slides.length < 2) return;

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
	}, [emblaApi, slides.length]);

	return (
		<div
			className={className ? `embla ${className}` : "embla"}
			style={
				{
					"--slide-size": "auto",
					"--slide-spacing": "1rem",
				} as React.CSSProperties
			}
		>
			<div className="embla__viewport" ref={emblaRef}>
				<div className="embla__container">
					{slides.map((slide) => (
						<AdvertisementSlideItem key={slide.id} slide={slide} />
					))}
				</div>
			</div>

			{scrollSnaps.length > 1 && (
				<div className="flex justify-center mt-4">
					<div className="embla__dots">
						{scrollSnaps.map((snap, index) => (
							<DotButton
								key={snap}
								onClick={() => onDotButtonClick(index)}
								className={"embla__dot".concat(
									index === selectedIndex ? " embla__dot--selected" : "",
								)}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function AdvertisementSlideItem({ slide }: { slide: AdvertisementSlide }) {
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
				className="inline-block overflow-hidden rounded-2xl border bg-slate-50 h-[220px] sm:h-[280px] md:h-[320px] w-auto max-w-[90vw]"
				style={aspectRatio ? ({ aspectRatio } as React.CSSProperties) : undefined}
				target={slide.url.startsWith("http") ? "_blank" : undefined}
				rel={slide.url.startsWith("http") ? "noreferrer" : undefined}
			>
				<img
					src={slide.imageUrl}
					alt={slide.label}
					loading="lazy"
					onLoad={onImageLoad}
					className="block h-full w-full object-cover"
				/>
			</a>
		</div>
	);
}
