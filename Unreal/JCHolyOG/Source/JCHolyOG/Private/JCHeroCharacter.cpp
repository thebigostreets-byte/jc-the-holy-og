#include "JCHeroCharacter.h"
#include "JCAbilityOverlay.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "Components/CapsuleComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/InputComponent.h"
#include "Blueprint/UserWidget.h"
#include "DrawDebugHelpers.h"
#include "Engine/World.h"
#include "UObject/ConstructorHelpers.h"

AJCHeroCharacter::AJCHeroCharacter()
{
    PrimaryActorTick.bCanEverTick = true;
    GetCapsuleComponent()->InitCapsuleSize(42.f, 96.f);

    PlaceholderBody = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("PlaceholderBody"));
    PlaceholderBody->SetupAttachment(GetCapsuleComponent());
    PlaceholderBody->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    PlaceholderBody->SetRelativeScale3D(FVector(.5f, .4f, 1.6f));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(
        TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (Cube.Succeeded()) PlaceholderBody->SetStaticMesh(Cube.Object);

    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(GetRootComponent());
    CameraBoom->TargetArmLength = 440.f;
    CameraBoom->SocketOffset = FVector(0.f, 0.f, 80.f);
    CameraBoom->bUsePawnControlRotation = true;

    FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
    FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
    FollowCamera->bUsePawnControlRotation = false;

    bUseControllerRotationYaw = false;
    GetCharacterMovement()->bOrientRotationToMovement = true;
    GetCharacterMovement()->MaxWalkSpeed = 630.f;
    GetCharacterMovement()->MaxFlySpeed = 1850.f;
    GetCharacterMovement()->AirControl = .55f;
}

void AJCHeroCharacter::BeginPlay()
{
    Super::BeginPlay();
}

void AJCHeroCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (bFlying)
    {
        const float Vertical = (bAscendHeld ? 1.f : 0.f) - (bDescendHeld ? 1.f : 0.f);
        if (!FMath::IsNearlyZero(Vertical)) AddMovementInput(FVector::UpVector, Vertical);
    }

#if PLATFORM_ANDROID || PLATFORM_IOS
    // Possession may happen after BeginPlay; make the touch HUD when locally controlled.
    if (!MobileOverlay && IsLocallyControlled())
    {
        if (APlayerController* PC = Cast<APlayerController>(GetController()))
        {
            MobileOverlay = CreateWidget<UJCAbilityOverlay>(PC, UJCAbilityOverlay::StaticClass());
            if (MobileOverlay) MobileOverlay->AddToViewport(10);
        }
    }
#endif
}

void AJCHeroCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis(TEXT("MoveForward"), this, &AJCHeroCharacter::MoveForward);
    Input->BindAxis(TEXT("MoveRight"), this, &AJCHeroCharacter::MoveRight);
    Input->BindAxis(TEXT("LookYaw"), this, &AJCHeroCharacter::LookYaw);
    Input->BindAxis(TEXT("LookPitch"), this, &AJCHeroCharacter::LookPitch);
    Input->BindAction(TEXT("Flight"), IE_Pressed, this, &AJCHeroCharacter::ToggleFlight);
    Input->BindAction(TEXT("Boost"), IE_Pressed, this, &AJCHeroCharacter::PressBoost);
    Input->BindAction(TEXT("Boost"), IE_Released, this, &AJCHeroCharacter::ReleaseBoost);
    Input->BindAction(TEXT("Ascend"), IE_Pressed, this, &AJCHeroCharacter::PressAscend);
    Input->BindAction(TEXT("Ascend"), IE_Released, this, &AJCHeroCharacter::ReleaseAscend);
    Input->BindAction(TEXT("Descend"), IE_Pressed, this, &AJCHeroCharacter::PressDescend);
    Input->BindAction(TEXT("Descend"), IE_Released, this, &AJCHeroCharacter::ReleaseDescend);
    Input->BindAction(TEXT("Lightning"), IE_Pressed, this, &AJCHeroCharacter::CastLightning);
}

void AJCHeroCharacter::MoveForward(float Value)
{
    if (FMath::IsNearlyZero(Value) || !Controller) return;
    const FRotator View = Controller->GetControlRotation();
    const FVector Direction = bFlying
        ? FRotationMatrix(View).GetUnitAxis(EAxis::X)
        : FRotationMatrix(FRotator(0.f, View.Yaw, 0.f)).GetUnitAxis(EAxis::X);
    AddMovementInput(Direction, Value);
}

void AJCHeroCharacter::MoveRight(float Value)
{
    if (FMath::IsNearlyZero(Value) || !Controller) return;
    const FRotator View = Controller->GetControlRotation();
    const FVector Direction =
        FRotationMatrix(FRotator(0.f, View.Yaw, 0.f)).GetUnitAxis(EAxis::Y);
    AddMovementInput(Direction, Value);
}

void AJCHeroCharacter::LookYaw(float Value) { AddControllerYawInput(Value); }
void AJCHeroCharacter::LookPitch(float Value) { AddControllerPitchInput(Value); }

void AJCHeroCharacter::ToggleFlight()
{
    bFlying = !bFlying;
    UCharacterMovementComponent* Movement = GetCharacterMovement();
    if (bFlying)
    {
        // Give immediate altitude, not a lengthy tutorial or mission gate.
        SetActorLocation(GetActorLocation() + FVector(0.f, 0.f, 160.f), true);
        Movement->SetMovementMode(MOVE_Flying);
        Movement->MaxFlySpeed = 1850.f;
    }
    else
    {
        Movement->SetMovementMode(MOVE_Falling);
        bBoostHeld = bAscendHeld = bDescendHeld = false;
    }
    bUseControllerRotationYaw = bFlying;
    Movement->bOrientRotationToMovement = !bFlying;
}

void AJCHeroCharacter::SetBoostHeld(bool bHeld)
{
    bBoostHeld = bHeld;
    GetCharacterMovement()->MaxFlySpeed = (bFlying && bBoostHeld) ? 4300.f : 1850.f;
}
void AJCHeroCharacter::SetAscendHeld(bool bHeld) { bAscendHeld = bHeld; }
void AJCHeroCharacter::SetDescendHeld(bool bHeld) { bDescendHeld = bHeld; }

void AJCHeroCharacter::PressBoost() { SetBoostHeld(true); }
void AJCHeroCharacter::ReleaseBoost() { SetBoostHeld(false); }
void AJCHeroCharacter::PressAscend() { SetAscendHeld(true); }
void AJCHeroCharacter::ReleaseAscend() { SetAscendHeld(false); }
void AJCHeroCharacter::PressDescend() { SetDescendHeld(true); }
void AJCHeroCharacter::ReleaseDescend() { SetDescendHeld(false); }

void AJCHeroCharacter::CastLightning()
{
    if (!FollowCamera || !GetWorld()) return;
    const FVector Start = FollowCamera->GetComponentLocation();
    const FVector AimEnd = Start + FollowCamera->GetForwardVector() * 3500.f;
    FHitResult Hit;
    const bool bHit = GetWorld()->LineTraceSingleByChannel(
        Hit, Start, AimEnd, ECC_Visibility);
    const FVector End = bHit ? Hit.ImpactPoint : AimEnd;
    // Visual debugging placeholder only. No damage or VFX is claimed.
    DrawDebugLine(GetWorld(), Start, End, FColor::Cyan, false, .4f, 0, 8.f);
    OnLightningRequested(Start, End);
}
