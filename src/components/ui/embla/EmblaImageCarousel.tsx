import type { EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect } from "react";
import "../../../css/embla.css";

import { DotButton, useDotButton } from "./EmblaCarouselDotButtons";

export type EmblaImageSlide = {
	id: string;
	src: string;
	alt: string;
};

type PropType = {
	slides: EmblaImageSlide[];
	options?: EmblaOptionsType;
	className?: string;
};

const EmblaImageCarousel = ({ slides, options, className }: PropType) => {
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
		}, 3000);

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
						<div className="embla__slide" key={slide.id}>
							<div className="inline-flex overflow-hidden rounded-xl border bg-slate-50 h-[260px] sm:h-[340px] md:h-[420px] max-h-[55vh] w-fit max-w-[90vw]">
								<img
									src={slide.src}
									alt={slide.alt}
									loading="lazy"
									className="block h-full w-auto max-w-full object-contain"
								/>
							</div>
						</div>
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
};

export default EmblaImageCarousel;
