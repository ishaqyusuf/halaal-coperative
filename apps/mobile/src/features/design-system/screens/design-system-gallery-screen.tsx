import { AppList } from "@/components/app/app-list"
import { AppSheet } from "@/components/app/app-sheet"
import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { EmptyState } from "@/components/app/empty-state"
import {
  ResultScreen,
  ReviewRow,
  ReviewSummary,
  SubmittingState,
} from "@/components/app/result-screen"
import {
  ScreenHeaderButton,
  ScreenHero,
  ScreenShell,
} from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { DateField } from "@/components/ui/date-field"
import { DatePicker } from "@/components/ui/date-picker"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { ListCard, RecordRow } from "@/components/ui/list-card"
import { MoneyField } from "@/components/ui/money-field"
import { PhoneField } from "@/components/ui/phone-field"
import { SectionHeader } from "@/components/ui/section-header"
import { SegmentedControl } from "@/components/ui/segmented-control"
import {
  SegmentedPager,
  useLaneTabsAnchor,
  usePagerPosition,
} from "@/components/ui/segmented-pager"
import { SelectField } from "@/components/ui/select-field"
import { DetailSkeleton, HomeSkeleton, ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill, statusToneFor } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { applyThemeOverride, useColorScheme, useColors } from "@/hooks/use-color"
import { addMonthsDateOnly, todayDateOnly } from "@/lib/date-only"
import { formatMoney } from "@/lib/money"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import { View } from "react-native"

export type GalleryView =
  | "kit"
  | "lanes"
  | "list"
  | "hero"
  | "success"
  | "error"
  | "submitting"
export type GalleryPose = "swipe" | "tap"
export type GallerySheet = "floating" | "auto-long" | "form" | "confirm" | "date" | "select"

const MEMBERS = [
  ["Aisha Bello", "QHC-0001 · Ordinary", 25000, "Active"],
  ["Ibrahim Yusuf", "QHC-0002 · Ordinary", 30000, "Active"],
  ["Khadija Sanni", "QHC-0003 · Staff", 15000, "Pending KYC"],
  ["Abdullahi Musa", "QHC-0004 · Ordinary", 50000, "Active"],
  ["Fatima Abubakar", "QHC-0005 · Founding", 40000, "Suspended"],
  ["Musa Lawal", "QHC-0006 · Ordinary", 20000, "Active"],
  ["Zainab Adeyemi", "QHC-0007 · Associate", 10000, "Active"],
  ["Hauwa Ibrahim", "QHC-0008 · Ordinary", 25000, "Exception"],
  ["Sadiq Abdulkadir", "QHC-0009 · Ordinary", 35000, "Posted"],
  ["Hafsat Umar", "QHC-0010 · Staff", 25000, "Active"],
  ["Usman Danjuma", "QHC-0011 · Ordinary", 15000, "Paused"],
  ["Maryam Bala", "QHC-0012 · Ordinary", 20000, "Active"],
] as const

const TYPE_ROWS = [
  ["hero", "Hero · 36/42 · 800 · tabular", "₦1,245,000"],
  ["screenTitle", "Screen title · 26/32 · 800", "Members"],
  ["title", "Title · 20/26 · 800", "Aisha Bello"],
  ["section", "Section · 16/22 · 800", "Needs attention"],
  ["body", "Body · 16/22 · 500", "November contribution posted"],
  ["small", "Small · 14/20 · 500", "QHC-0001 · Ordinary member"],
  ["label", "Label · 13/18 · 700", "Monthly commitment"],
  ["caption", "Caption · 12/16 · 700", "Due 25 Nov"],
  ["money", "Money · 16/22 · 800 · tabular", "₦25,000"],
] as const

const SWATCHES = [
  "background",
  "card",
  "surfaceRaised",
  "foreground",
  "mutedForeground",
  "border",
  "primary",
  "brand",
  "accent",
  "heroStart",
  "heroMid",
  "heroEnd",
  "brandWarm",
  "brandVivid",
  "success",
  "destructive",
] as const

function ThemeToggle() {
  const { colorScheme } = useColorScheme()
  return (
    <ScreenHeaderButton
      accessibilityLabel={`Switch to ${colorScheme === "dark" ? "light" : "dark"} theme`}
      icon={colorScheme === "dark" ? "Sun" : "Moon"}
      onPress={() => applyThemeOverride(colorScheme === "dark" ? "light" : "dark")}
      testID="gallery-theme-toggle"
    />
  )
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View className="gap-[10px]">
      <SectionHeader title={title} />
      {children}
    </View>
  )
}

function GallerySheets({
  onClose,
  open,
}: {
  onClose: () => void
  open: GallerySheet | null
}) {
  const [date, setDate] = useState<string | null>(null)
  const [type, setType] = useState<string | null>(null)
  const [name, setName] = useState("")
  const today = todayDateOnly()
  return (
    <>
      <AppSheet onClose={onClose} title="Aisha Bello" visible={open === "floating"}>
        <View className="flex-row items-center gap-[12px]">
          <View className="flex-1 gap-[2px]">
            <Text variant="title">Aisha Bello</Text>
            <Text className="text-muted-foreground" variant="small">
              QHC-0001 · Ordinary member
            </Text>
          </View>
          <StatusPill label="Active" tone="success" />
        </View>
        <View className="flex-row gap-[8px]">
          {[
            ["Savings", 1245000],
            ["Monthly", 25000],
            ["Shares", 100000],
          ].map(([label, amount]) => (
            <View className="flex-1 gap-[2px] rounded-[18px] bg-surface-raised p-[12px]" key={label}>
              <Text className="text-muted-foreground" variant="label">
                {label}
              </Text>
              <Text adjustsFontSizeToFit numberOfLines={1} variant="money">
                {formatMoney(Number(amount))}
              </Text>
            </View>
          ))}
        </View>
      </AppSheet>
      <AppSheet onClose={onClose} title="Statement lines" visible={open === "auto-long"}>
        <Text className="text-muted-foreground" variant="small">
          Read-only content taller than half the window expands to full screen.
        </Text>
        <ListCard>
          {MEMBERS.map(([memberName, meta, amount, status]) => (
            <RecordRow
              amount={formatMoney(amount)}
              key={memberName}
              meta={meta}
              status={status}
              statusTone={statusToneFor(status)}
              title={memberName}
            />
          ))}
        </ListCard>
      </AppSheet>
      <AppSheet
        dirty={name.length > 0}
        footer={
          <Button onPress={onClose}>
            <Text>Review</Text>
          </Button>
        }
        headerTrailing="1 of 2"
        onClose={onClose}
        title="New member"
        variant="form"
        visible={open === "form"}
      >
        <FormField helper="As it appears on their ID" label="Full name">
          <Input onChangeText={setName} placeholder="e.g. Aisha Bello" value={name} />
        </FormField>
        <FormField label="Member type">
          <SelectField
            onChange={setType}
            options={[
              { label: "Ordinary member", value: "ordinary" },
              { label: "Staff member", value: "staff" },
              { label: "Associate", value: "associate" },
            ]}
            placeholder="Choose type"
            value={type}
          />
        </FormField>
        <FormField label="Joined date">
          <DateField maximumDate={today} onChange={setDate} value={date} />
        </FormField>
      </AppSheet>
      <ConfirmSheet
        confirmLabel="Suspend member"
        description="Aisha Bello will lose app access until reinstated. Contributions already posted stay on the ledger."
        onCancel={onClose}
        onConfirm={onClose}
        title="Suspend Aisha Bello?"
        tone="destructive"
        visible={open === "confirm"}
      />
      <AppSheet onClose={onClose} title="Joined date" variant="picker" visible={open === "date"}>
        <DateFieldDemoPicker />
      </AppSheet>
      <AppSheet onClose={onClose} title="Member type" variant="picker" visible={open === "select"}>
        <Text className="text-muted-foreground" variant="small">
          SelectField opens this floating picker.
        </Text>
      </AppSheet>
    </>
  )
}

function DateFieldDemoPicker() {
  // Rendered inline for screenshots; DateField opens the same calendar.
  const [value, setValue] = useState(todayDateOnly())
  return <DatePicker maximumDate={todayDateOnly()} onChange={setValue} value={value} />
}

function LaneRows({ offset }: { offset: number }) {
  return (
    <ListCard>
      {MEMBERS.slice(offset, offset + 3).map(([memberName, meta, value, status]) => (
        <RecordRow
          amount={formatMoney(value)}
          key={memberName}
          meta={meta}
          status={status}
          statusTone={statusToneFor(status)}
          title={memberName}
        />
      ))}
    </ListCard>
  )
}

function KitView({ onOpenSheet }: { onOpenSheet: (sheet: GallerySheet) => void }) {
  const colors = useColors()
  const today = todayDateOnly()
  const [lane, setLane] = useState<"ledger" | "commitments" | "collections">("ledger")
  const laneIndex = ["ledger", "commitments", "collections"].indexOf(lane)
  const position = usePagerPosition(laneIndex)
  const [amount, setAmount] = useState("25000")
  const [phone, setPhone] = useState("8064471209")
  const [date, setDate] = useState<string | null>(null)
  const [type, setType] = useState<string | null>("ordinary")
  const [loading, setLoading] = useState(false)

  return (
    <>
      <Section title="Type">
        <ListCard inset={false}>
          {TYPE_ROWS.map(([variant, spec, sample]) => (
            <View className="gap-[4px] px-[16px] py-[12px]" key={variant}>
              <Text className="text-muted-foreground" variant="label">
                {spec}
              </Text>
              <Text variant={variant}>{sample}</Text>
            </View>
          ))}
        </ListCard>
      </Section>

      <Section title="Colour">
        <View className="flex-row flex-wrap gap-[8px]">
          {SWATCHES.map((key) => (
            <View className="w-[80px] gap-[4px]" key={key}>
              <View
                style={{
                  backgroundColor: colors[key],
                  borderColor: colors.border,
                  borderRadius: 14,
                  borderWidth: 1,
                  height: 44,
                }}
              />
              <Text className="text-muted-foreground" numberOfLines={1} variant="caption">
                {key}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Buttons">
        <Button
          loading={loading}
          onPress={() => {
            setLoading(true)
            setTimeout(() => setLoading(false), 1500)
          }}
        >
          <Text>Review</Text>
        </Button>
        <Button variant="secondary">
          <Text>Add another member</Text>
        </Button>
        <View className="flex-row gap-[10px]">
          <Button className="flex-1" variant="outline">
            <Text>Outline</Text>
          </Button>
          <Button className="flex-1" variant="destructive">
            <Text>Suspend</Text>
          </Button>
        </View>
        <View className="flex-row gap-[10px]">
          <Button className="flex-1" loading>
            <Text>Saving</Text>
          </Button>
          <Button className="flex-1" disabled>
            <Text>Disabled</Text>
          </Button>
        </View>
      </Section>

      <Section title="Fields">
        <FormField helper="As it appears on their ID" label="Full name">
          <Input placeholder="e.g. Aisha Bello" />
        </FormField>
        <FormField error="Enter the member's full name" label="Full name">
          <Input placeholder="e.g. Aisha Bello" />
        </FormField>
        <FormField helper="Minimum ₦5,000" label="Monthly commitment">
          <MoneyField onChangeValue={setAmount} value={amount} />
        </FormField>
        <FormField label="Phone">
          <PhoneField onChangeValue={setPhone} value={phone} />
        </FormField>
        <FormField label="Member type">
          <SelectField
            onChange={setType}
            options={[
              { label: "Ordinary member", value: "ordinary" },
              { label: "Staff member", value: "staff" },
              { label: "Associate", value: "associate" },
            ]}
            placeholder="Choose type"
            value={type}
          />
        </FormField>
        <FormField helper="No later than today" label="Joined date">
          <DateField
            maximumDate={today}
            minimumDate={addMonthsDateOnly(today, -60)}
            onChange={setDate}
            value={date}
          />
        </FormField>
      </Section>

      <Section title="Segments and lanes">
        <SegmentedControl
          accessibilityLabel="Contribution lanes"
          onChange={setLane}
          options={[
            { count: 34, label: "Ledger", value: "ledger" },
            { count: 24, label: "Commitments", value: "commitments" },
            { count: 6, label: "Collections", value: "collections" },
          ]}
          position={position}
          value={lane}
        />
        <SegmentedPager
          index={laneIndex}
          onIndexChange={(index) =>
            setLane((["ledger", "commitments", "collections"] as const)[index] ?? "ledger")
          }
          pages={[0, 3, 6].map((offset) => function LanePage() {
            return <LaneRows offset={offset} />
          })}
          position={position}
        />
      </Section>

      <Section title="Rows and pills">
        <SectionHeader action={{ label: "Statement", onPress: () => undefined }} title="Your position" />
        <SectionHeader title="This week" value="₦125,000" />
        <View className="flex-row flex-wrap gap-[8px]">
          {(["success", "warning", "danger", "info", "brand", "neutral", "lilac"] as const).map(
            (tone) => (
              <StatusPill key={tone} label={tone} tone={tone} />
            )
          )}
        </View>
      </Section>

      <Section title="Banners and states">
        <StatusBanner
          description="Showing entries saved at 7:48 PM."
          kind="offline"
          onRetry={() => undefined}
          title="You’re offline"
        />
        <StatusBanner description="Updated 12 minutes ago." kind="stale" title="Showing saved data" />
        <StatusBanner
          description="The server didn’t respond."
          kind="error"
          onRetry={() => undefined}
          title="Couldn’t refresh"
        />
        <EmptyState
          action={{ label: "Add member", onPress: () => undefined }}
          description="New members appear here once created."
          icon="UsersRound"
          title="No members yet"
        />
        <EmptyState
          action={{ label: "Try again", onPress: () => undefined }}
          description="Check your connection and try again."
          icon="CircleAlert"
          title="Couldn’t load members"
          tone="error"
        />
      </Section>

      <Section title="Skeletons">
        <ListSkeleton rows={3} />
        <HomeSkeleton />
        <DetailSkeleton rows={3} />
      </Section>

      <Section title="Sheets">
        {(
          [
            ["floating", "Floating sheet (fits half)"],
            ["auto-long", "Read-only, taller → expands"],
            ["form", "Form → full screen"],
            ["confirm", "Destructive confirm"],
            ["date", "Date picker sheet"],
          ] as const
        ).map(([sheet, label]) => (
          <Button key={sheet} onPress={() => onOpenSheet(sheet)} variant="outline">
            <Text>{label}</Text>
          </Button>
        ))}
      </Section>
    </>
  )
}

function ListView() {
  const [query, setQuery] = useState("")
  const [pages, setPages] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const rows = useMemo(
    () =>
      Array.from({ length: pages * 12 }, (_, index) => {
        const base = MEMBERS[index % MEMBERS.length]
        return {
          amount: base[2],
          id: `${index}`,
          meta: `CTR-2611-${String(141 - index).padStart(4, "0")} · Nov ${14 - (index % 12)}`,
          name: base[0],
          status: base[3],
        }
      }).filter((row) => row.name.toLowerCase().includes(query.trim().toLowerCase())),
    [pages, query]
  )
  return (
    <AppList
      data={rows}
      header={
        <SegmentedControl
          accessibilityLabel="Lanes"
          onChange={() => undefined}
          options={[
            { count: 34, label: "Ledger", value: "ledger" },
            { count: 24, label: "Commitments", value: "commitments" },
            { count: 6, label: "Collections", value: "collections" },
          ]}
          value="ledger"
        />
      }
      headerActions={<ThemeToggle />}
      isFetchingNextPage={loadingMore}
      keyExtractor={(row) => row.id}
      onEndReached={() => {
        if (loadingMore || pages >= 4) return
        setLoadingMore(true)
        setTimeout(() => {
          setPages((count) => count + 1)
          setLoadingMore(false)
        }, 900)
      }}
      onRefresh={() => {
        setRefreshing(true)
        setTimeout(() => setRefreshing(false), 1200)
      }}
      refreshing={refreshing}
      renderItem={({ item, position }) => (
        <RecordRow
          amount={formatMoney(item.amount)}
          meta={item.meta}
          onPress={() => undefined}
          position={position}
          status={item.status}
          statusTone={statusToneFor(item.status)}
          title={item.name}
        />
      )}
      search={{
        localSearch: true,
        onChangeText: setQuery,
        placeholder: "Search name or member number",
        totalCount: rows.length,
        value: query,
      }}
      title="Contributions"
    />
  )
}

const LANES = ["ledger", "commitments", "collections"] as const
const LANE_ROWS = [12, 8, 4]

/**
 * 02 v3 tab motion on a full screen: the thumb slides, lanes move as a
 * carousel (tap 340ms, swipe follows the finger and commits past 22%), and
 * a tap while scrolled past the tabs brings them back into view. `pose`
 * freezes a mid-swipe (0.42) or mid-tap (0.55) frame for screenshots.
 */
function LanesView({ pose }: { pose: GalleryPose | null }) {
  const [lane, setLane] = useState<(typeof LANES)[number]>("ledger")
  const laneIndex = LANES.indexOf(lane)
  const position = usePagerPosition(laneIndex)
  const anchor = useLaneTabsAnchor()
  useEffect(() => {
    if (!pose) return
    const timer = setTimeout(() => position.set(pose === "swipe" ? 0.42 : 0.55), 700)
    return () => clearTimeout(timer)
  }, [pose, position])
  return (
    <ScreenShell
      header={
        <View className="gap-[8px]" ref={anchor.anchorRef}>
          <SegmentedControl
            accessibilityLabel="Contribution lanes"
            onChange={setLane}
            options={[
              { count: 34, label: "Ledger", value: "ledger" },
              { count: 24, label: "Commitments", value: "commitments" },
              { count: 6, label: "Collections", value: "collections" },
            ]}
            position={position}
            value={lane}
          />
          <Text className="text-muted-foreground" variant="label">
            Updated 7:48 PM
          </Text>
        </View>
      }
      headerActions={<ThemeToggle />}
      onRefresh={() => undefined}
      onScroll={anchor.onScroll}
      scrollRef={anchor.scrollRef}
      title="Contributions"
    >
      <SegmentedPager
        eager={pose !== null}
        index={laneIndex}
        onIndexChange={(index) => setLane(LANES[index] ?? "ledger")}
        onTapTransition={anchor.revealTabs}
        pages={LANES.map((laneKey, laneNumber) =>
          function LanePage() {
            return (
              <View className="gap-[10px]">
                <SectionHeader
                  title={
                    laneKey === "ledger"
                      ? "This week"
                      : laneKey === "commitments"
                        ? "Active plans"
                        : "Batches"
                  }
                  value={laneKey === "ledger" ? formatMoney(125000) : undefined}
                />
                <ListCard>
                  {Array.from({ length: LANE_ROWS[laneNumber] ?? 4 }, (_, row) => {
                    const member = MEMBERS[(row + laneNumber * 3) % MEMBERS.length]
                    return (
                      <RecordRow
                        amount={formatMoney(member[2])}
                        key={`${laneKey}-${row}`}
                        meta={
                          laneKey === "commitments"
                            ? `${formatMoney(member[2])} / month · next 25 Nov`
                            : member[1]
                        }
                        status={member[3]}
                        statusTone={statusToneFor(member[3])}
                        title={member[0]}
                      />
                    )
                  })}
                </ListCard>
              </View>
            )
          }
        )}
        position={position}
      />
    </ScreenShell>
  )
}

function HeroView() {
  return (
    <ScreenShell
      hero={
        <ScreenHero>
          <View className="gap-[16px]">
            <View className="flex-row items-center gap-[12px]">
              <View className="size-[44px] items-center justify-center rounded-full bg-hero-foreground/15">
                <Text className="text-hero-foreground" variant="section">
                  AB
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-hero-foreground/75" variant="body">
                  Assalamu alaikum,
                </Text>
                <Text className="text-hero-foreground" variant="title">
                  Aisha Bello
                </Text>
              </View>
              <ThemeToggleInverse />
            </View>
            <View className="gap-[4px]">
              <Text className="text-hero-foreground/75" variant="label">
                Total savings
              </Text>
              <Text className="text-hero-foreground" variant="hero">
                {formatMoney(1245000)}
              </Text>
            </View>
          </View>
        </ScreenHero>
      }
      onRefresh={() => undefined}
    >
      <SectionHeader action={{ label: "Statement", onPress: () => undefined }} title="Your position" />
      <ListCard>
        {MEMBERS.map(([memberName, meta, amount, status]) => (
          <RecordRow
            amount={formatMoney(amount)}
            key={memberName}
            meta={meta}
            status={status}
            statusTone={statusToneFor(status)}
            title={memberName}
          />
        ))}
      </ListCard>
    </ScreenShell>
  )
}

function ThemeToggleInverse() {
  const { colorScheme } = useColorScheme()
  return (
    <ScreenHeaderButton
      accessibilityLabel="Toggle theme"
      icon={colorScheme === "dark" ? "Sun" : "Moon"}
      onPress={() => applyThemeOverride(colorScheme === "dark" ? "light" : "dark")}
      tone="inverse"
    />
  )
}

export function DesignSystemGalleryScreen({
  initialSheet,
  pose = null,
  view,
}: {
  initialSheet: GallerySheet | null
  pose?: GalleryPose | null
  view: GalleryView
}) {
  const router = useRouter()
  const [sheet, setSheet] = useState<GallerySheet | null>(null)
  useEffect(() => {
    if (!initialSheet) return
    const timer = setTimeout(() => setSheet(initialSheet), 400)
    return () => clearTimeout(timer)
  }, [initialSheet])

  if (view === "list") return <ListView />
  if (view === "lanes") return <LanesView pose={pose} />
  if (view === "hero") return <HeroView />
  if (view === "submitting") return <SubmittingState />
  if (view === "success" || view === "error") {
    return (
      <ResultScreen
        description={
          view === "success"
            ? "Sumayyah Abdullahi is now QHC-0026. Their first ₦25,000 contribution is due on 25 Nov."
            : "We couldn’t create this member. Nothing was saved. Check your connection and try again."
        }
        details={
          view === "success" ? (
            <>
              <ReviewRow label="Invite" value="Sent by SMS" />
              <ReviewRow
                label="KYC"
                value={<StatusPill label="Pending KYC" tone="warning" />}
              />
            </>
          ) : undefined
        }
        onDone={() => router.back()}
        primary={{ label: view === "success" ? "View member" : "Try again", onPress: () => undefined }}
        secondary={{
          label: view === "success" ? "Add another member" : "Edit details",
          onPress: () => undefined,
        }}
        title={view === "success" ? "Member created" : "Couldn’t create member"}
        tone={view}
      />
    )
  }

  return (
    <ScreenShell headerActions={<ThemeToggle />} testID="design-system-gallery" title="Design kit">
      <KitView onOpenSheet={setSheet} />
      <Section title="Review summary">
        <ReviewSummary onEdit={() => undefined} title="Membership">
          <ReviewRow label="Member number" value="QHC-0026" />
          <ReviewRow label="Joined" value="3 Nov 2026" />
          <ReviewRow label="Monthly commitment" tabular value={formatMoney(25000)} />
        </ReviewSummary>
      </Section>
      <GallerySheets onClose={() => setSheet(null)} open={sheet} />
    </ScreenShell>
  )
}
