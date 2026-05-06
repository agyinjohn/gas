'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, MessageCircle, User, Calendar, Filter } from 'lucide-react';
import { stationsApi } from '@/lib/api';
import { Card, Badge, Input } from '@/components/ui';
import { formatRelativeTime, formatCylinders } from '@/lib/utils';

const STATION_ID = typeof window !== 'undefined' ? localStorage.getItem('gasgo_station_id') || '' : '';

export default function StationReviewsPage() {
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const { data: stationData } = useQuery({
    queryKey: ['station', 'details', STATION_ID],
    queryFn: () => stationsApi.getById(STATION_ID).then((r) => r.data.station),
    enabled: !!STATION_ID,
  });

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['station', 'reviews', STATION_ID, page],
    queryFn: () => stationsApi.getReviews(STATION_ID, page).then((r) => r.data),
    enabled: !!STATION_ID,
  });

  const reviews = reviewsData?.reviews || [];
  const filteredReviews = ratingFilter 
    ? reviews.filter((review: any) => review.stationRating === ratingFilter)
    : reviews;

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review: any) => {
      if (review.stationRating) {
        distribution[review.stationRating as keyof typeof distribution]++;
      }
    });
    return distribution;
  };

  const ratingDistribution = getRatingDistribution();
  const totalReviews = reviews.length;

  const renderStars = (rating: number, size = 'w-4 h-4') => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating 
                ? 'text-yellow-500 fill-current' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Customer Reviews</h1>
        <p className="text-sm text-gray-500">
          {totalReviews} reviews • {stationData?.ratingAvg?.toFixed(1) || 'N/A'} average rating
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Rating Overview */}
        <Card>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <p className="text-4xl font-black text-gray-900">
                {stationData?.ratingAvg?.toFixed(1) || 'N/A'}
              </p>
              {stationData?.ratingAvg && renderStars(Math.round(stationData.ratingAvg), 'w-5 h-5')}
              <p className="text-sm text-gray-500 mt-1">{totalReviews} reviews</p>
            </div>
            
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating as keyof typeof ratingDistribution];
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-2 mb-1">
                    <span className="text-sm w-6">{rating}</span>
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Rating Filter */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by rating:</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setRatingFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                ratingFilter === null
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({totalReviews})
            </button>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingDistribution[rating as keyof typeof ratingDistribution];
              return (
                <button
                  key={rating}
                  onClick={() => setRatingFilter(rating)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    ratingFilter === rating
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {rating}★ ({count})
                </button>
              );
            })}
          </div>
        </Card>

        {/* Reviews List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <Card className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">
              {ratingFilter ? `No ${ratingFilter}-star reviews yet` : 'No reviews yet'}
            </p>
            <p className="text-sm text-gray-400">
              Reviews will appear here when customers rate your service
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredReviews.map((review: any) => (
              <Card key={review._id}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {review.userId?.name || 'Anonymous Customer'}
                        </p>
                        <div className="flex items-center gap-2">
                          {renderStars(review.stationRating)}
                          <span className="text-sm text-gray-500">
                            {formatRelativeTime(review.stationRatedAt)}
                          </span>
                        </div>
                      </div>
                      
                      <Badge className="bg-gray-100 text-gray-700">
                        {review.orderType}
                      </Badge>
                    </div>
                    
                    {review.stationRatingComment && (
                      <p className="text-gray-700 text-sm mb-2">
                        "{review.stationRatingComment}"
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Order: {formatCylinders(review.cylinders)}</span>
                      <span>•</span>
                      <span>#{review._id.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Load More */}
        {reviewsData?.pagination && reviewsData.pagination.page * reviewsData.pagination.limit < reviewsData.pagination.total && (
          <div className="text-center">
            <button
              onClick={() => setPage(prev => prev + 1)}
              className="px-6 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Load More Reviews
            </button>
          </div>
        )}

        {/* Review Insights */}
        <Card className="bg-blue-50 border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">Review Insights</h3>
          <div className="space-y-1 text-sm text-blue-700">
            <p>• Respond to reviews to show you care about customer feedback</p>
            <p>• High ratings help attract more customers to your station</p>
            <p>• Address common complaints to improve your service quality</p>
          </div>
        </Card>
      </div>
    </div>
  );
}