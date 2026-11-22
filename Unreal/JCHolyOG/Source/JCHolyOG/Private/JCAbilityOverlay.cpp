#include "JCAbilityOverlay.h"
#include "JCHeroCharacter.h"
#include "Blueprint/WidgetTree.h"
#include "Components/Button.h"
#include "Components/TextBlock.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "GameFramework/PlayerController.h"

static UButton* AddButton(UWidgetTree* Tree, UCanvasPanel* Canvas,
    const TCHAR* Name, const TCHAR* Label, const FVector2D Position)
{
    UButton* Button = Tree->ConstructWidget<UButton>(UButton::StaticClass(), FName(Name));
    UTextBlock* Text = Tree->ConstructWidget<UTextBlock>();
    Text->SetText(FText::FromString(Label));
    Text->SetJustification(ETextJustify::Center);
    Button->AddChild(Text);
    UCanvasPanelSlot* Slot = Canvas->AddChildToCanvas(Button);
    Slot->SetAnchors(FAnchors(1.f, 1.f));
    Slot->SetAlignment(FVector2D(1.f, 1.f));
    Slot->SetPosition(Position);
    Slot->SetSize(FVector2D(130.f, 56.f));
    return Button;
}

void UJCAbilityOverlay::NativeOnInitialized()
{
    Super::NativeOnInitialized();
    UCanvasPanel* Canvas = WidgetTree->ConstructWidget<UCanvasPanel>();
    WidgetTree->RootWidget = Canvas;

    // Keeps a dual virtual joystick for moving/looking, plus actual native touch
    // ability buttons; positions will need safe-area/device testing.
    UButton* Fly = AddButton(WidgetTree, Canvas, TEXT("FlyButton"), TEXT("FLY"),
        FVector2D(-24.f, -250.f));
    UButton* Boost = AddButton(WidgetTree, Canvas, TEXT("BoostButton"), TEXT("BOOST"),
        FVector2D(-165.f, -250.f));
    UButton* Up = AddButton(WidgetTree, Canvas, TEXT("UpButton"), TEXT("UP"),
        FVector2D(-24.f, -320.f));
    UButton* Down = AddButton(WidgetTree, Canvas, TEXT("DownButton"), TEXT("DOWN"),
        FVector2D(-165.f, -320.f));
    UButton* Power = AddButton(WidgetTree, Canvas, TEXT("PowerButton"), TEXT("LIGHTNING"),
        FVector2D(-24.f, -390.f));

    Fly->OnClicked.AddDynamic(this, &UJCAbilityOverlay::FlightClicked);
    Boost->OnPressed.AddDynamic(this, &UJCAbilityOverlay::BoostPressed);
    Boost->OnReleased.AddDynamic(this, &UJCAbilityOverlay::BoostReleased);
    Up->OnPressed.AddDynamic(this, &UJCAbilityOverlay::UpPressed);
    Up->OnReleased.AddDynamic(this, &UJCAbilityOverlay::UpReleased);
    Down->OnPressed.AddDynamic(this, &UJCAbilityOverlay::DownPressed);
    Down->OnReleased.AddDynamic(this, &UJCAbilityOverlay::DownReleased);
    Power->OnClicked.AddDynamic(this, &UJCAbilityOverlay::LightningClicked);
}

#define JC_HERO Cast<AJCHeroCharacter>(GetOwningPlayerPawn())
void UJCAbilityOverlay::FlightClicked() { if (auto* Hero = JC_HERO) Hero->ToggleFlight(); }
void UJCAbilityOverlay::BoostPressed() { if (auto* Hero = JC_HERO) Hero->SetBoostHeld(true); }
void UJCAbilityOverlay::BoostReleased() { if (auto* Hero = JC_HERO) Hero->SetBoostHeld(false); }
void UJCAbilityOverlay::UpPressed() { if (auto* Hero = JC_HERO) Hero->SetAscendHeld(true); }
void UJCAbilityOverlay::UpReleased() { if (auto* Hero = JC_HERO) Hero->SetAscendHeld(false); }
void UJCAbilityOverlay::DownPressed() { if (auto* Hero = JC_HERO) Hero->SetDescendHeld(true); }
void UJCAbilityOverlay::DownReleased() { if (auto* Hero = JC_HERO) Hero->SetDescendHeld(false); }
void UJCAbilityOverlay::LightningClicked() { if (auto* Hero = JC_HERO) Hero->CastLightning(); }
#undef JC_HERO
