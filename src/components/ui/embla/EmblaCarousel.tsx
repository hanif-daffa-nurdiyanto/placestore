import type { EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect } from "react";
import "../../../css/embla.css";

import { DotButton, useDotButton } from "./EmblaCarouselDotButtons";

type PropType = {
	slides: number[];
	options?: EmblaOptionsType;
};

const EmblaCarousel = (props: PropType) => {
	const { slides, options } = props;
	const [emblaRef, emblaApi] = useEmblaCarousel(options);

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

	// const {
	// 	prevBtnDisabled,
	// 	nextBtnDisabled,
	// 	onPrevButtonClick,
	// 	onNextButtonClick,
	// } = usePrevNextButtons(emblaApi);

	return (
		<div className="embla">
				<div className="embla__viewport" ref={emblaRef}>
					<div className="embla__container">
						{slides.map((slide) => (
							<div className="embla__slide" key={slide}>
								<div className="embla__slide__number">
									<span>{slide + 1}</span>
								</div>
							</div>
						))}
					</div>
				</div>

			<div className="flex justify-center mt-4">
				{/* <div className="embla__buttons">
					<PrevButton onClick={onPrevButtonClick} disabled={prevBtnDisabled} />
					<NextButton onClick={onNextButtonClick} disabled={nextBtnDisabled} />
				</div> */}

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
		</div>
	);
};

export default EmblaCarousel;
